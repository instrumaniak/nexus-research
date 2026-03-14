import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import type { KbItem } from '../../drizzle/schema';
import { kbItems } from '../../drizzle/schema';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database';
import { EmbeddingsService, float32ArrayToBlob } from '../embeddings/embeddings.service';
import { LoggingService } from '../logging/logging.service';
import { SaveKbItemDto } from './dto/save-kb-item.dto';

type FtsRow = {
  id: number;
  title: string;
  summary: string | null;
  source_url: string | null;
  tags: string | null;
  created_at: number;
  fts_score: number;
};

type VecRow = {
  id: number;
  title: string;
  summary: string | null;
  source_url: string | null;
  tags: string | null;
  created_at: number;
  vec_score: number;
};

@Injectable()
export class KbService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
    private readonly embeddingsService: EmbeddingsService,
    private readonly loggingService: LoggingService,
  ) {}

  async save(userId: number, dto: SaveKbItemDto): Promise<KbItem> {
    const vec = await this.embeddingsService.embed(dto.content);
    const embeddingBlob = float32ArrayToBlob(vec);

    const item = await this.db
      .insert(kbItems)
      .values({
        userId,
        title: dto.title,
        content: dto.content,
        summary: dto.summary ?? null,
        sourceUrl: dto.sourceUrl ?? null,
        tags: dto.tags ? JSON.stringify(dto.tags) : null,
        embedding: embeddingBlob,
        createdAt: new Date(),
      })
      .returning({
        id: kbItems.id,
        userId: kbItems.userId,
        title: kbItems.title,
        content: kbItems.content,
        summary: kbItems.summary,
        sourceUrl: kbItems.sourceUrl,
        tags: kbItems.tags,
        createdAt: kbItems.createdAt,
      })
      .get();

    if (!item) {
      throw new InternalServerErrorException('Failed to save KB item');
    }

    this.db.run(
      sql`INSERT INTO kb_items_vec (item_id, embedding) VALUES (${item.id}, ${embeddingBlob})`,
    );

    this.loggingService.log(`KB item saved: "${dto.title}"`, 'KbService', userId);

    return {
      ...item,
      embedding: null,
    };
  }

  async list(userId: number, tag?: string, page = 1, limit = 20): Promise<KbItem[]> {
    const normalizedTag = tag?.trim();
    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const safeLimit = Number.isFinite(limit) ? Math.min(50, Math.max(1, Math.floor(limit))) : 20;
    const offset = (safePage - 1) * safeLimit;

    let whereClause = eq(kbItems.userId, userId);

    if (normalizedTag) {
      const tagLike = `%"${normalizedTag}"%`;
      whereClause = and(
        whereClause,
        sql`${kbItems.tags} is not null and ${kbItems.tags} like ${tagLike}`,
      );
    }

    const rows = await this.db
      .select({
        id: kbItems.id,
        userId: kbItems.userId,
        title: kbItems.title,
        content: kbItems.content,
        summary: kbItems.summary,
        sourceUrl: kbItems.sourceUrl,
        tags: kbItems.tags,
        createdAt: kbItems.createdAt,
      })
      .from(kbItems)
      .where(whereClause)
      .orderBy(desc(kbItems.createdAt))
      .limit(safeLimit)
      .offset(offset)
      .all();

    return rows.map((row) => ({
      ...row,
      embedding: null,
    }));
  }

  async search(userId: number, q: string): Promise<KbItem[]> {
    const query = q.trim();
    if (query.length === 0) {
      throw new BadRequestException('Search query must not be empty');
    }

    const ftsQuery = this.buildFtsQuery(query);
    const ftsPromise = Promise.resolve(
      this.db.all(sql`
        SELECT kb_items.id, kb_items.title, kb_items.summary, kb_items.source_url,
               kb_items.tags, kb_items.created_at,
               rank as fts_score
        FROM kb_items_fts
        JOIN kb_items ON kb_items.id = kb_items_fts.rowid
        WHERE kb_items_fts MATCH ${ftsQuery}
          AND kb_items.user_id = ${userId}
        ORDER BY rank
        LIMIT 20
      `),
    ) as Promise<FtsRow[]>;

    const vecPromise = this.embeddingsService.embed(query).then((queryVec) => {
      const queryBlob = float32ArrayToBlob(queryVec);
      return Promise.resolve(
        this.db.all(sql`
          SELECT kb_items.id, kb_items.title, kb_items.summary, kb_items.source_url,
                 kb_items.tags, kb_items.created_at,
                 distance as vec_score
          FROM kb_items_vec
          JOIN kb_items ON kb_items.id = kb_items_vec.item_id
          WHERE kb_items_vec.embedding MATCH ${queryBlob}
            AND kb_items.user_id = ${userId}
            AND k = 20
          ORDER BY distance
        `),
      ) as Promise<VecRow[]>;
    });

    const [ftsRows, vecRows] = await Promise.all([ftsPromise, vecPromise]);

    if (ftsRows.length === 0 && vecRows.length === 0) {
      this.loggingService.log('KB search returned no results', 'KbService', userId);
      return [];
    }

    const rankedIds = this.hybridRank(ftsRows, vecRows, 5);
    if (rankedIds.length === 0) {
      return [];
    }

    const items = await this.db
      .select({
        id: kbItems.id,
        userId: kbItems.userId,
        title: kbItems.title,
        content: kbItems.content,
        summary: kbItems.summary,
        sourceUrl: kbItems.sourceUrl,
        tags: kbItems.tags,
        createdAt: kbItems.createdAt,
      })
      .from(kbItems)
      .where(and(eq(kbItems.userId, userId), inArray(kbItems.id, rankedIds)))
      .all();

    const order = new Map(rankedIds.map((id, index) => [id, index]));

    return items
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map((row) => ({
        ...row,
        embedding: null,
      }));
  }

  async findOne(userId: number, id: number): Promise<KbItem> {
    const item = await this.db
      .select({
        id: kbItems.id,
        userId: kbItems.userId,
        title: kbItems.title,
        content: kbItems.content,
        summary: kbItems.summary,
        sourceUrl: kbItems.sourceUrl,
        tags: kbItems.tags,
        createdAt: kbItems.createdAt,
      })
      .from(kbItems)
      .where(and(eq(kbItems.id, id), eq(kbItems.userId, userId)))
      .get();

    if (!item) {
      throw new NotFoundException('KB item not found');
    }

    return {
      ...item,
      embedding: null,
    };
  }

  async delete(userId: number, id: number): Promise<void> {
    await this.findOne(userId, id);

    this.db.run(sql`DELETE FROM kb_items_vec WHERE item_id = ${id}`);

    await this.db.delete(kbItems).where(and(eq(kbItems.id, id), eq(kbItems.userId, userId)));

    this.loggingService.log(`KB item deleted: id=${id}`, 'KbService', userId);
  }

  private hybridRank(ftsRows: FtsRow[], vecRows: VecRow[], topK = 5): number[] {
    const ftsRanks = new Map<number, number>();
    const vecRanks = new Map<number, number>();

    ftsRows.forEach((row, index) => {
      ftsRanks.set(row.id, index + 1);
    });

    vecRows.forEach((row, index) => {
      vecRanks.set(row.id, index + 1);
    });

    const allIds = new Set<number>();
    ftsRows.forEach((row) => allIds.add(row.id));
    vecRows.forEach((row) => allIds.add(row.id));

    const scored = Array.from(allIds).map((id) => {
      const ftsRank = ftsRanks.get(id) ?? 999;
      const vecRank = vecRanks.get(id) ?? 999;
      const score = 1 / (ftsRank + 60) + 1 / (vecRank + 60);

      return { id, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK).map((item) => item.id);
  }

  private buildFtsQuery(input: string): string {
    const tokens = input.split(/\s+/).filter((token) => token.length > 0);
    return tokens.map((token) => `"${token.replace(/\"/g, '""')}"`).join(' ');
  }
}

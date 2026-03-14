import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import * as schema from '../../drizzle/schema';
import { DRIZZLE_CLIENT } from '../database';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { LoggingService } from '../logging/logging.service';
import { KbService } from './kb.service';

describe('KbService', () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let service: KbService;
  let embeddingsService: { embed: jest.Mock };
  let loggingService: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };

  beforeEach(async () => {
    sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    sqliteVec.load(sqlite);

    sqlite.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT,
        role TEXT NOT NULL DEFAULT 'USER',
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at INTEGER NOT NULL,
        last_login_at INTEGER
      );

      CREATE TABLE kb_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        source_url TEXT,
        tags TEXT,
        embedding BLOB,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS kb_items_fts USING fts5(
        title, content, summary,
        content=kb_items,
        content_rowid=id
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS kb_items_vec USING vec0(
        item_id INTEGER PRIMARY KEY,
        embedding float[384]
      );

      CREATE TRIGGER IF NOT EXISTS kb_items_fts_insert AFTER INSERT ON kb_items BEGIN
        INSERT INTO kb_items_fts(rowid, title, content, summary) VALUES (new.id, new.title, new.content, new.summary);
      END;
      CREATE TRIGGER IF NOT EXISTS kb_items_fts_delete AFTER DELETE ON kb_items BEGIN
        INSERT INTO kb_items_fts(kb_items_fts, rowid, title, content, summary) VALUES ('delete', old.id, old.title, old.content, old.summary);
      END;
      CREATE TRIGGER IF NOT EXISTS kb_items_fts_update AFTER UPDATE ON kb_items BEGIN
        INSERT INTO kb_items_fts(kb_items_fts, rowid, title, content, summary) VALUES ('delete', old.id, old.title, old.content, old.summary);
        INSERT INTO kb_items_fts(rowid, title, content, summary) VALUES (new.id, new.title, new.content, new.summary);
      END;
    `);

    db = drizzle(sqlite, { schema });

    embeddingsService = {
      embed: jest.fn().mockResolvedValue(new Float32Array(384)),
    };

    loggingService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KbService,
        { provide: DRIZZLE_CLIENT, useValue: db },
        { provide: EmbeddingsService, useValue: embeddingsService },
        { provide: LoggingService, useValue: loggingService },
      ],
    }).compile();

    service = module.get<KbService>(KbService);
  });

  afterEach(() => {
    sqlite.close();
  });

  async function insertUser(): Promise<number> {
    const inserted = await db
      .insert(schema.users)
      .values({
        username: 'alice',
        email: 'alice@example.com',
        password: 'hashed',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: new Date(),
        lastLoginAt: null,
      })
      .returning({ id: schema.users.id })
      .get();

    return inserted.id;
  }

  it('save inserts item, writes vec row, logs, and returns without embedding', async () => {
    const userId = await insertUser();
    embeddingsService.embed.mockResolvedValueOnce(new Float32Array(384));

    const result = await service.save(userId, {
      title: 'Test Title',
      content: 'Test content',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    const vecCount = sqlite.prepare('SELECT COUNT(*) as count FROM kb_items_vec').get() as {
      count: number;
    };

    expect(result.embedding).toBeNull();
    expect(result.title).toBe('Test Title');
    expect(vecCount.count).toBe(1);
    expect(loggingService.log).toHaveBeenCalledWith(
      'KB item saved: "Test Title"',
      'KbService',
      userId,
    );
  });

  it('list enforces pagination and omits embedding', async () => {
    const userId = await insertUser();

    await service.save(userId, {
      title: 'Item 1',
      content: 'Content 1',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });
    await service.save(userId, {
      title: 'Item 2',
      content: 'Content 2',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });
    await service.save(userId, {
      title: 'Item 3',
      content: 'Content 3',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    const result = await service.list(userId, undefined, 2, 1);

    expect(result).toHaveLength(1);
    expect(result[0]?.embedding).toBeNull();
  });

  it('list filters by tag', async () => {
    const userId = await insertUser();

    await service.save(userId, {
      title: 'AI Item',
      content: 'Content 1',
      summary: undefined,
      sourceUrl: undefined,
      tags: ['ai', 'ml'],
    });

    await service.save(userId, {
      title: 'Web Item',
      content: 'Content 2',
      summary: undefined,
      sourceUrl: undefined,
      tags: ['web'],
    });

    const result = await service.list(userId, 'ai', 1, 20);

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe('AI Item');
  });

  it('list orders by createdAt desc with pagination', async () => {
    const userId = await insertUser();

    const first = await service.save(userId, {
      title: 'First',
      content: 'Content 1',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    const second = await service.save(userId, {
      title: 'Second',
      content: 'Content 2',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    const third = await service.save(userId, {
      title: 'Third',
      content: 'Content 3',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    await db
      .update(schema.kbItems)
      .set({ createdAt: new Date('2026-01-01T00:00:00.000Z') })
      .where(eq(schema.kbItems.id, first.id));
    await db
      .update(schema.kbItems)
      .set({ createdAt: new Date('2026-01-02T00:00:00.000Z') })
      .where(eq(schema.kbItems.id, second.id));
    await db
      .update(schema.kbItems)
      .set({ createdAt: new Date('2026-01-03T00:00:00.000Z') })
      .where(eq(schema.kbItems.id, third.id));

    const page1 = await service.list(userId, undefined, 1, 2);
    const page2 = await service.list(userId, undefined, 2, 2);

    expect(page1.map((item) => item.title)).toEqual(['Third', 'Second']);
    expect(page2.map((item) => item.title)).toEqual(['First']);
  });

  it('search rejects whitespace-only query', async () => {
    const userId = await insertUser();

    await expect(service.search(userId, '   ')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('search handles free-form operator characters without throwing', async () => {
    const userId = await insertUser();
    embeddingsService.embed.mockResolvedValue(new Float32Array(384));

    const saved = await service.save(userId, {
      title: 'C++ Notes',
      content: 'C++ a:b *',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    const result = await service.search(userId, 'C++ a:b *');

    expect(result.some((item) => item.id === saved.id)).toBe(true);
  });

  it('search logs and returns empty array when no results', async () => {
    const userId = await insertUser();
    embeddingsService.embed.mockResolvedValueOnce(new Float32Array(384));

    const result = await service.search(userId, 'query');

    expect(result).toEqual([]);
    expect(loggingService.log).toHaveBeenCalledWith(
      'KB search returned no results',
      'KbService',
      userId,
    );
  });

  it('search returns ranked results without embeddings', async () => {
    const userId = await insertUser();
    embeddingsService.embed.mockResolvedValue(new Float32Array(384));

    const first = await service.save(userId, {
      title: 'First',
      content: 'alpha content',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    const second = await service.save(userId, {
      title: 'Second',
      content: 'beta content',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    const result = await service.search(userId, 'alpha');

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((row) => row.embedding === null)).toBe(true);
    expect(result.map((row) => row.id)).toEqual(expect.arrayContaining([first.id, second.id]));
  });

  it('findOne omits embedding', async () => {
    const userId = await insertUser();
    embeddingsService.embed.mockResolvedValueOnce(new Float32Array(384));

    const saved = await service.save(userId, {
      title: 'Item',
      content: 'Content',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    const result = await service.findOne(userId, saved.id);

    expect(result.embedding).toBeNull();
  });

  it('findOne throws NotFoundException for non-owner', async () => {
    const userId = await insertUser();
    embeddingsService.embed.mockResolvedValueOnce(new Float32Array(384));

    const saved = await service.save(userId, {
      title: 'Item',
      content: 'Content',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    await expect(service.findOne(userId + 1, saved.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete removes vec row, deletes item, and logs', async () => {
    const userId = await insertUser();
    embeddingsService.embed.mockResolvedValueOnce(new Float32Array(384));

    const saved = await service.save(userId, {
      title: 'Item',
      content: 'Content',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    await service.delete(userId, saved.id);

    const remaining = sqlite.prepare('SELECT COUNT(*) as count FROM kb_items').get() as {
      count: number;
    };
    const remainingVec = sqlite.prepare('SELECT COUNT(*) as count FROM kb_items_vec').get() as {
      count: number;
    };

    expect(remaining.count).toBe(0);
    expect(remainingVec.count).toBe(0);
    expect(loggingService.log).toHaveBeenCalledWith(
      `KB item deleted: id=${saved.id}`,
      'KbService',
      userId,
    );
  });

  it('delete throws NotFoundException for non-owner', async () => {
    const userId = await insertUser();
    embeddingsService.embed.mockResolvedValueOnce(new Float32Array(384));

    const saved = await service.save(userId, {
      title: 'Item',
      content: 'Content',
      summary: undefined,
      sourceUrl: undefined,
      tags: undefined,
    });

    await expect(service.delete(userId + 1, saved.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { messages, sessions } from '../../drizzle/schema';
import { DRIZZLE_CLIENT, DrizzleClient } from '../database';

export interface ChatSource {
  title: string;
  url: string;
}

export interface SessionSummary {
  id: number;
  title: string;
  mode: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface SessionMessage {
  id: number;
  role: string;
  content: string;
  sources: ChatSource[];
  createdAt: Date;
}

export interface SessionWithMessages {
  session: Omit<SessionSummary, 'messageCount'>;
  messages: SessionMessage[];
}

@Injectable()
export class ChatService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient) {}

  async saveSession(
    userId: number,
    query: string,
    answer: string,
    sources: ChatSource[],
    mode: string,
    sessionId?: number,
  ): Promise<number> {
    const now = new Date();
    let resolvedSessionId = sessionId;

    if (resolvedSessionId) {
      const existingSession = await this.db
        .select()
        .from(sessions)
        .where(and(eq(sessions.id, resolvedSessionId), eq(sessions.userId, userId)))
        .get();

      if (!existingSession) {
        throw new NotFoundException('Session not found');
      }

      await this.db
        .update(sessions)
        .set({ updatedAt: now })
        .where(eq(sessions.id, resolvedSessionId));
    } else {
      const inserted = await this.db
        .insert(sessions)
        .values({
          userId,
          title: this.buildSessionTitle(query),
          mode,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: sessions.id })
        .get();

      resolvedSessionId = inserted.id;
    }

    await this.db.insert(messages).values([
      {
        sessionId: resolvedSessionId,
        role: 'user',
        content: query,
        createdAt: now,
        sources: null,
      },
      {
        sessionId: resolvedSessionId,
        role: 'assistant',
        content: answer,
        sources: JSON.stringify(sources),
        createdAt: now,
      },
    ]);

    return resolvedSessionId;
  }

  async getSessions(userId: number): Promise<SessionSummary[]> {
    const rows = await this.db
      .select({
        id: sessions.id,
        title: sessions.title,
        mode: sessions.mode,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        messageCount: sql<number>`count(${messages.id})`.mapWith(Number),
      })
      .from(sessions)
      .leftJoin(messages, eq(messages.sessionId, sessions.id))
      .where(eq(sessions.userId, userId))
      .groupBy(sessions.id)
      .orderBy(desc(sessions.updatedAt))
      .all();

    return rows.map((row) => ({
      ...row,
      messageCount: row.messageCount ?? 0,
    }));
  }

  async getSession(sessionId: number, userId: number): Promise<SessionWithMessages> {
    const session = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
      .get();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const sessionMessages = await this.db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt)
      .all();

    return {
      session: {
        id: session.id,
        title: session.title,
        mode: session.mode,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      messages: sessionMessages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        sources: this.parseSources(message.sources),
        createdAt: message.createdAt,
      })),
    };
  }

  async verifySessionOwnership(sessionId: number, userId: number): Promise<void> {
    const session = await this.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
      .get();

    if (!session) {
      throw new NotFoundException('Session not found');
    }
  }

  private buildSessionTitle(query: string): string {
    const trimmed = query.trim();
    if (trimmed.length <= 60) {
      return trimmed;
    }

    const shortened = trimmed.slice(0, 60).trim();
    const lastSpace = shortened.lastIndexOf(' ');

    return lastSpace > 0 ? shortened.slice(0, lastSpace).trim() : shortened;
  }

  private parseSources(rawSources: string | null): ChatSource[] {
    if (!rawSources) {
      return [];
    }

    try {
      const parsed = JSON.parse(rawSources) as unknown;

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (item): item is ChatSource =>
          typeof item === 'object' &&
          item !== null &&
          'title' in item &&
          'url' in item &&
          typeof item.title === 'string' &&
          typeof item.url === 'string',
      );
    } catch {
      return [];
    }
  }
}

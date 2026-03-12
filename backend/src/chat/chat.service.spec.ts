import { NotFoundException } from '@nestjs/common';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../../drizzle/schema';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let sqlite: Database.Database;
  let service: ChatService;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  const logging = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(() => {
    sqlite = new Database(':memory:');
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

      CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        mode TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        sources TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `);

    db = drizzle(sqlite, { schema });
    service = new ChatService(db, logging as never);
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

  it('saveSession without sessionId creates a session and two messages', async () => {
    const userId = await insertUser();

    const sessionId = await service.saveSession(
      userId,
      'What is NestJS and why would someone use it for backend APIs?',
      'NestJS is a framework.',
      [{ title: 'NestJS', url: 'https://nestjs.com' }],
      'WEB_SEARCH',
    );

    const savedSession = await db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sessionId))
      .get();
    const savedMessages = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.sessionId, sessionId))
      .all();

    expect(savedSession?.title).toBe('What is NestJS and why would someone use it for backend');
    expect(savedMessages).toHaveLength(2);
    expect(savedMessages[0]?.role).toBe('user');
    expect(savedMessages[1]?.role).toBe('assistant');
  });

  it('saveSession with sessionId reuses the session and appends messages', async () => {
    const userId = await insertUser();

    const sessionId = await service.saveSession(
      userId,
      'First question',
      'First answer',
      [],
      'WEB_SEARCH',
    );

    const reusedSessionId = await service.saveSession(
      userId,
      'Second question',
      'Second answer',
      [],
      'WEB_SEARCH',
      sessionId,
    );

    const savedMessages = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.sessionId, sessionId))
      .all();

    expect(reusedSessionId).toBe(sessionId);
    expect(savedMessages).toHaveLength(4);
  });

  it('getSession throws NotFoundException when the user does not own the session', async () => {
    const userId = await insertUser();
    const sessionId = await service.saveSession(userId, 'Question', 'Answer', [], 'WEB_SEARCH');

    await expect(service.getSession(sessionId, userId + 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

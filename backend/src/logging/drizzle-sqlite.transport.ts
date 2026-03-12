import Transport from 'winston-transport';
import { logs } from '../../drizzle/schema';
import type { DrizzleClient } from '../database';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

function normalizeLevel(level: unknown): LogLevel {
  if (typeof level !== 'string') {
    return 'INFO';
  }

  const upper = level.toUpperCase();
  if (upper === 'WARN' || upper === 'WARNING') {
    return 'WARN';
  }
  if (upper === 'ERROR') {
    return 'ERROR';
  }
  return 'INFO';
}

function safeStringifyMeta(meta: unknown): string | null {
  if (!meta || typeof meta !== 'object') {
    return null;
  }

  try {
    return JSON.stringify(meta);
  } catch {
    return null;
  }
}

export class DrizzleSqliteTransport extends Transport {
  constructor(private readonly db: DrizzleClient) {
    super();
  }

  log(info: unknown, callback: () => void): void {
    setImmediate(() => {
      void callback();
    });

    void (async () => {
      try {
        const record = info as Record<string, unknown> | null;
        const message = typeof record?.message === 'string' ? record.message : '';
        const context = typeof record?.context === 'string' ? record.context : 'App';
        const userId =
          typeof record?.userId === 'number'
            ? record.userId
            : record?.userId === null
              ? null
              : null;

        const meta = safeStringifyMeta(record?.meta);
        const createdAt = record?.createdAt instanceof Date ? record.createdAt : new Date();

        await this.db.insert(logs).values({
          level: normalizeLevel(record?.level),
          context,
          message,
          userId,
          meta,
          createdAt,
        });
      } catch {
        // Never let a logging failure crash the app.
      }
    })();
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger, format, transports, type Logger } from 'winston';
import { DRIZZLE_CLIENT, type DrizzleClient } from '../database';
import type { LoggingConfig } from '../config/logging.config';
import { DrizzleSqliteTransport } from './drizzle-sqlite.transport';

type Meta = Record<string, unknown>;

@Injectable()
export class LoggingService {
  private readonly logger: Logger;

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: DrizzleClient,
    private readonly configService: ConfigService,
  ) {
    const level = (this.configService.get<LoggingConfig['level']>('logging.level') ??
      'info') as string;

    this.logger = createLogger({
      level,
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize({ all: true }),
            format.timestamp(),
            format.printf((info) => {
              const record = info as unknown as {
                level: string;
                message: string;
                context?: string;
                userId?: number | null;
                meta?: Meta | undefined;
              };

              const ctx = record.context ?? 'App';
              const user = typeof record.userId === 'number' ? ` userId=${record.userId}` : '';
              const metaStr =
                record.meta && Object.keys(record.meta).length > 0
                  ? ` meta=${JSON.stringify(record.meta)}`
                  : '';

              return `${record.level} [${ctx}]${user} ${record.message}${metaStr}`;
            }),
          ),
        }),
        new DrizzleSqliteTransport(this.db),
      ],
    });
  }

  log(message: string, context?: string, userId?: number, meta?: Meta): void {
    this.safeWrite('info', message, context, userId, meta);
  }

  warn(message: string, context?: string, userId?: number, meta?: Meta): void {
    this.safeWrite('warn', message, context, userId, meta);
  }

  error(message: string, context?: string, userId?: number, meta?: Meta): void {
    this.safeWrite('error', message, context, userId, meta);
  }

  private safeWrite(
    level: 'info' | 'warn' | 'error',
    message: string,
    context?: string,
    userId?: number,
    meta?: Meta,
  ): void {
    try {
      this.logger.log({
        level,
        message,
        context: context ?? 'App',
        userId: typeof userId === 'number' ? userId : null,
        meta: meta ?? null,
        createdAt: new Date(),
      });
    } catch {
      // Never throw from logging.
    }
  }
}

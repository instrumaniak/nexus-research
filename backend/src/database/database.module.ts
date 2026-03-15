import { Global, Inject, Module, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as sqliteVec from 'sqlite-vec';
import { join } from 'path';
import * as schema from '../../drizzle/schema';
import type { DatabaseConfig } from '../config';
import { DRIZZLE_CLIENT, SQLITE_CLIENT } from './database.constants';

@Global()
@Module({
  providers: [
    {
      provide: SQLITE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): BetterSqlite3.Database => {
        const dbPath = configService.get<DatabaseConfig['path']>('database.path');
        if (!dbPath) {
          throw new Error('Missing required config: database.path');
        }
        const sqlite = new Database(dbPath);
        sqliteVec.load(sqlite);
        sqlite.pragma('journal_mode = WAL');
        return sqlite;
      },
    },
    {
      provide: DRIZZLE_CLIENT,
      useFactory: (sqlite: BetterSqlite3.Database) => drizzle(sqlite, { schema }),
      inject: [SQLITE_CLIENT],
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class DatabaseModule implements OnModuleInit, OnApplicationShutdown {
  constructor(
    @Inject(SQLITE_CLIENT)
    private readonly sqlite: BetterSqlite3.Database,
    @Inject(DRIZZLE_CLIENT)
    private readonly db: ReturnType<typeof drizzle>,
  ) {}

  onModuleInit(): void {
    // Run migrations on startup
    // Resolve migrations folder relative to this file's location
    // backend/dist/src/database/database.module.js -> backend/drizzle/migrations
    const migrationsPath = join(__dirname, '../../../drizzle/migrations');
    migrate(this.db, {
      migrationsFolder: migrationsPath,
    });
  }

  onApplicationShutdown(): void {
    this.sqlite.close();
  }
}

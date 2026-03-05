import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../drizzle/schema';
import { DRIZZLE_CLIENT, SQLITE_CLIENT } from './database.constants';

@Global()
@Module({
  providers: [
    {
      provide: SQLITE_CLIENT,
      useFactory: (): BetterSqlite3.Database => {
        const dbPath = process.env.DATABASE_PATH ?? './nexus.db';
        const sqlite = new Database(dbPath);
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
export class DatabaseModule implements OnApplicationShutdown {
  constructor(
    @Inject(SQLITE_CLIENT)
    private readonly sqlite: BetterSqlite3.Database,
  ) {}

  onApplicationShutdown(): void {
    this.sqlite.close();
  }
}

// DEPRECATED: Application providers should use DatabaseModule + DRIZZLE_CLIENT injection.
// This file remains only for legacy scripts (e.g. scripts/create-superadmin.ts).
import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { join } from 'path';

// Resolve database path relative to project root (where .env is located)
// backend/drizzle/db.ts -> backend -> root
const projectRoot = join(__dirname, '../..');
const envDbPath = process.env.DATABASE_PATH;
let dbPath: string;
if (envDbPath) {
  // If path is absolute, use it; otherwise resolve relative to project root
  if (envDbPath.startsWith('/') || envDbPath.startsWith('C:') || envDbPath.startsWith('D:')) {
    dbPath = envDbPath;
  } else {
    dbPath = join(projectRoot, envDbPath);
  }
} else {
  // Default to nexus.db in project root
  dbPath = join(projectRoot, 'nexus.db');
}

// Initialize better-sqlite3 connection
const sqlite: BetterSqlite3.Database = new Database(dbPath);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

// Create drizzle client
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite instance for advanced operations
export { sqlite };

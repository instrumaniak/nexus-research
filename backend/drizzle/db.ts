import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const dbPath = process.env.DATABASE_PATH ?? './nexus.db';

// Initialize better-sqlite3 connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

// Create drizzle client
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite instance for advanced operations
export { sqlite };

import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../drizzle/schema';

export const DRIZZLE_CLIENT = 'DRIZZLE_CLIENT';
export const SQLITE_CLIENT = 'SQLITE_CLIENT';

export type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

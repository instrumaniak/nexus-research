import type { Config } from 'drizzle-kit';

export default {
  dialect: 'sqlite',
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? './nexus.db',
  },
} satisfies Config;

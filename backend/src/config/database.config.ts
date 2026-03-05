import { registerAs } from '@nestjs/config';
import { getValidatedEnv } from './env.validation';

export const databaseConfig = registerAs('database', () => {
  const env = getValidatedEnv();
  return {
    path: env.DATABASE_PATH,
  };
});

export type DatabaseConfig = ReturnType<typeof databaseConfig>;

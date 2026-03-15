import { registerAs } from '@nestjs/config';
import { join } from 'path';
import { getValidatedEnv } from './env.validation';

export const databaseConfig = registerAs('database', () => {
  const env = getValidatedEnv();
  let dbPath = env.DATABASE_PATH;

  // If path is relative, resolve it relative to the project root (where .env is located)
  // Assuming project root is 2 levels up from this config file (backend/src/config)
  if (!dbPath.startsWith('/') && !dbPath.startsWith('./') && !dbPath.startsWith('../')) {
    dbPath = './' + dbPath;
  }

  // Resolve relative paths against the project root
  // backend/dist/src/config -> backend/dist/src -> backend/dist -> backend -> project-root
  const projectRoot = join(__dirname, '../../../..');
  const resolvedPath = join(projectRoot, dbPath);

  return {
    path: resolvedPath,
  };
});

export type DatabaseConfig = ReturnType<typeof databaseConfig>;

import { defineConfig } from '@playwright/test';
import path from 'node:path';

const port = Number(process.env.E2E_PORT ?? 3100);
const dbPath =
  process.env.E2E_DATABASE_PATH ?? path.resolve(__dirname, '..', 'e2e-test.db');
const jwtAccessSecret = process.env.E2E_JWT_ACCESS_SECRET ?? 'test-access-secret-32-chars-minimum';
const jwtRefreshSecret = process.env.E2E_JWT_REFRESH_SECRET ?? 'test-refresh-secret-32-chars-minimum';

process.env.E2E_PORT ??= String(port);
process.env.E2E_DATABASE_PATH ??= dbPath;
process.env.E2E_JWT_ACCESS_SECRET ??= jwtAccessSecret;
process.env.E2E_JWT_REFRESH_SECRET ??= jwtRefreshSecret;

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${port}`,
  },
  webServer: {
    command: `node e2e/prepare-db.js && NODE_ENV=test PORT=${port} DATABASE_PATH=${dbPath} JWT_ACCESS_SECRET=${jwtAccessSecret} JWT_REFRESH_SECRET=${jwtRefreshSecret} AI_PROVIDER_BASE_URL=http://localhost EMBEDDINGS_STUB=true npm run start -w backend`,
    port,
    reuseExistingServer: true,
    timeout: 120_000,
    cwd: path.resolve(__dirname, '..'),
  },
});

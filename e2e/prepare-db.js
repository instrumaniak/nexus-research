const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const sqliteVec = require('sqlite-vec');

const dbPath =
  process.env.E2E_DATABASE_PATH ?? path.resolve(__dirname, '..', 'e2e-test.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const sqlite = new Database(dbPath);
sqliteVec.load(sqlite);

const migrationPath = path.resolve(
  __dirname,
  '..',
  'backend',
  'drizzle',
  'migrations',
  '0001_fearless_reptil.sql',
);
const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

sqlite.exec(migrationSql);
sqlite.close();

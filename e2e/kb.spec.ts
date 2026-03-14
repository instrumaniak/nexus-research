import { test, expect, type APIRequestContext } from '@playwright/test';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

const dbPath = process.env.E2E_DATABASE_PATH ?? './e2e-test.db';

type Credentials = {
  username: string;
  email: string;
  password: string;
};

function openDb() {
  const db = new Database(dbPath);
  sqliteVec.load(db);
  return db;
}

function resetDb() {
  const db = openDb();
  db.exec('DELETE FROM kb_items;');
  db.exec('DELETE FROM kb_items_vec;');
  db.exec('DELETE FROM refresh_tokens;');
  db.exec('DELETE FROM users;');
  db.close();
}

function activateUser(email: string) {
  const db = openDb();
  db.prepare('UPDATE users SET status = ? WHERE email = ?').run('ACTIVE', email);
  db.close();
}

async function registerAndLogin(request: APIRequestContext, suffix: string) {
  const creds: Credentials = {
    username: `user_${suffix}`,
    email: `user_${suffix}@example.com`,
    password: 'Password123!'
  };

  const registerResponse = await request.post('/api/auth/register', {
    data: creds,
  });
  expect(registerResponse.status()).toBe(201);

  activateUser(creds.email);

  const loginResponse = await request.post('/api/auth/login', {
    data: { email: creds.email, password: creds.password },
  });
  expect(loginResponse.status()).toBe(201);
  const loginBody = await loginResponse.json();

  expect(loginBody.accessToken).toBeTruthy();

  return { accessToken: loginBody.accessToken as string, creds };
}

async function saveItem(
  request: APIRequestContext,
  token: string,
  payload: { title: string; content: string; tags?: string[] },
) {
  const response = await request.post('/api/kb/save', {
    data: payload,
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

test.beforeEach(() => {
  resetDb();
});

test('POST /api/kb/save then GET /api/kb/items returns saved item without embedding', async ({ request }) => {
  const { accessToken } = await registerAndLogin(request, 'save');

  const saved = await saveItem(request, accessToken, {
    title: 'AI Notes',
    content: 'Knowledge base content',
    tags: ['ai'],
  });

  expect(saved.embedding).toBeNull();

  const listResponse = await request.get('/api/kb/items', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(listResponse.status()).toBe(200);
  const items = await listResponse.json();

  expect(items).toHaveLength(1);
  expect(items[0].id).toBe(saved.id);
  expect(items[0].embedding).toBeNull();
});

test('GET /api/kb/items supports tag filtering and pagination ordering', async ({ request }) => {
  const { accessToken } = await registerAndLogin(request, 'list');

  const first = await saveItem(request, accessToken, { title: 'First', content: 'alpha', tags: ['ai'] });
  const second = await saveItem(request, accessToken, { title: 'Second', content: 'beta', tags: ['web'] });
  const third = await saveItem(request, accessToken, { title: 'Third', content: 'gamma', tags: ['ai'] });

  const db = openDb();
  db.prepare('UPDATE kb_items SET created_at = ? WHERE id = ?').run(1704067200000, first.id);
  db.prepare('UPDATE kb_items SET created_at = ? WHERE id = ?').run(1704153600000, second.id);
  db.prepare('UPDATE kb_items SET created_at = ? WHERE id = ?').run(1704240000000, third.id);
  db.close();

  const page1Response = await request.get('/api/kb/items?limit=2&page=1', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const page2Response = await request.get('/api/kb/items?limit=2&page=2', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const page1 = await page1Response.json();
  const page2 = await page2Response.json();

  expect(page1.map((item: { title: string }) => item.title)).toEqual(['Third', 'Second']);
  expect(page2.map((item: { title: string }) => item.title)).toEqual(['First']);

  const tagResponse = await request.get('/api/kb/items?tag=ai', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const tagged = await tagResponse.json();
  expect(tagged).toHaveLength(2);
  expect(tagged.map((item: { title: string }) => item.title).sort()).toEqual(['First', 'Third']);
});

test('GET /api/kb/search returns results without embedding', async ({ request }) => {
  const { accessToken } = await registerAndLogin(request, 'search');

  await saveItem(request, accessToken, { title: 'C++ Notes', content: 'C++ a:b *' });

  const searchResponse = await request.get('/api/kb/search?q=C%2B%2B', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(searchResponse.status()).toBe(200);
  const results = await searchResponse.json();

  expect(results.length).toBeGreaterThan(0);
  expect(results.every((item: { embedding: null }) => item.embedding === null)).toBe(true);
});

test('ownership checks for GET and DELETE /api/kb/items/:id', async ({ request }) => {
  const { accessToken } = await registerAndLogin(request, 'owner');
  const { accessToken: otherToken } = await registerAndLogin(request, 'other');

  const saved = await saveItem(request, accessToken, {
    title: 'Private',
    content: 'Owned content',
  });

  const otherGet = await request.get(`/api/kb/items/${saved.id}`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  expect(otherGet.status()).toBe(404);

  const otherDelete = await request.delete(`/api/kb/items/${saved.id}`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  expect(otherDelete.status()).toBe(404);

  const deleteResponse = await request.delete(`/api/kb/items/${saved.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(deleteResponse.status()).toBe(204);

  const afterDelete = await request.get(`/api/kb/items/${saved.id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(afterDelete.status()).toBe(404);
});

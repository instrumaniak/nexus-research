# Data Model

Schema source of truth: `backend/drizzle/schema.ts`
Never modify the DB directly. All changes go through Drizzle migrations.

## Tables

### users

| Column | Type | Notes |
|---|---|---|
| id | integer PK autoincrement | |
| username | text UNIQUE NOT NULL | |
| email | text UNIQUE NOT NULL | |
| password | text nullable | null for Google-only accounts (Phase 3) |
| google_id | text UNIQUE nullable | Phase 3 — not in schema until then |
| role | text NOT NULL default 'USER' | 'USER' or 'SUPERADMIN' |
| status | text NOT NULL default 'PENDING' | 'PENDING', 'ACTIVE', or 'BANNED' |
| created_at | integer (timestamp) | unix epoch |
| last_login_at | integer (timestamp) nullable | updated on successful login |

### refresh_tokens

| Column | Type | Notes |
|---|---|---|
| id | integer PK autoincrement | |
| user_id | integer FK → users.id | |
| token | text UNIQUE NOT NULL | hashed before storage |
| revoked | integer (boolean) default false | set true on logout or ban |
| expires_at | integer (timestamp) | |
| created_at | integer (timestamp) | |

### otp_codes — Phase 2 (added in migration 0002)

| Column | Type | Notes |
|---|---|---|
| id | integer PK autoincrement | |
| email | text NOT NULL | |
| code | text NOT NULL | 6-digit string |
| purpose | text NOT NULL | 'verify_email' or 'reset_password' |
| expires_at | integer (timestamp) | 10 minutes from creation |
| used | integer (boolean) default false | marked true after successful use |
| created_at | integer (timestamp) | |

### sessions

| Column | Type | Notes |
|---|---|---|
| id | integer PK autoincrement | |
| user_id | integer FK → users.id | |
| title | text NOT NULL | auto-generated from first user message |
| mode | text NOT NULL | 'WEB_SEARCH', 'KB_SEARCH', or 'DEEP_RESEARCH' |
| created_at | integer (timestamp) | |
| updated_at | integer (timestamp) | updated on each new message |

### messages

| Column | Type | Notes |
|---|---|---|
| id | integer PK autoincrement | |
| session_id | integer FK → sessions.id | |
| role | text NOT NULL | 'user' or 'assistant' |
| content | text NOT NULL | full message text |
| sources | text nullable | JSON array: `[{title: string, url: string}]` |
| created_at | integer (timestamp) | |

### kb_items

| Column | Type | Notes |
|---|---|---|
| id | integer PK autoincrement | |
| user_id | integer FK → users.id | KB is private per user |
| title | text NOT NULL | |
| content | text NOT NULL | full cleaned article text |
| summary | text nullable | AI-generated bullet summary |
| source_url | text nullable | original URL if saved from web |
| tags | text nullable | JSON string array: `["ai", "research"]` |
| embedding | blob nullable | float32[384] vector for sqlite-vec |
| created_at | integer (timestamp) | |

### logs

| Column | Type | Notes |
|---|---|---|
| id | integer PK autoincrement | |
| level | text NOT NULL | 'INFO', 'WARN', or 'ERROR' |
| context | text NOT NULL | NestJS context string e.g. 'AuthService' |
| message | text NOT NULL | human-readable log message |
| user_id | integer nullable FK → users.id | null for system-level events |
| meta | text nullable | JSON: requestId, agentStep, latencyMs, etc. |
| created_at | integer (timestamp) | |

## Virtual Tables (raw SQL in migration 0001)

### kb_items_fts — FTS5 full-text search

```sql
CREATE VIRTUAL TABLE kb_items_fts USING fts5(
  title, content, summary,
  content=kb_items,
  content_rowid=id
);
```

Kept in sync with kb_items via triggers (INSERT/UPDATE/DELETE).

### kb_items_vec — sqlite-vec semantic search

```sql
CREATE VIRTUAL TABLE kb_items_vec USING vec0(
  item_id INTEGER PRIMARY KEY,
  embedding float[384]
);
```

Populated by `KbService` when an embedding is generated for a new KB item.

## KB Search Strategy — Hybrid Ranking

When a user runs a KB search, two result sets are generated and merged:

1. **Semantic search** via sqlite-vec — cosine similarity on embedding vectors
2. **Keyword search** via FTS5 — BM25 ranking on title + content + summary

Results are combined using a simple reciprocal rank fusion (RRF) formula in `KbService.hybridRank()`. The top-k (default 5) items are passed to the Synthesizer.

## Schema Change Workflow

```bash
# 1. Edit backend/drizzle/schema.ts
# 2. Generate migration
npx drizzle-kit generate
# 3. Review the generated SQL in backend/drizzle/migrations/
# 4. Commit both schema.ts and the migration file together
git add backend/drizzle/schema.ts backend/drizzle/migrations/
git commit -m "schema: add otp_codes table"
```

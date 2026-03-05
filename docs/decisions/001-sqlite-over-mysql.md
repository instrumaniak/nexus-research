# ADR 001 — SQLite over MySQL

## Status: Accepted

## Date: 2026-03

## Context

Nexus is hosted on cPanel shared hosting (raziur.com) which provides both MySQL (via phpMyAdmin) and Node.js support. We need a database for a multi-user application with up to a few hundred users. The primary non-standard DB features required are:
- Full-text search (FTS) over knowledge base items
- Vector similarity search for semantic KB retrieval (embeddings)

## Decision

Use **SQLite** (via `better-sqlite3`) for both local development and production.

## Reasons

### Vector search is a hard constraint
- `sqlite-vec` provides float32 vector storage and cosine similarity search natively within SQLite
- MySQL has no equivalent free, self-hosted vector search solution
- The only MySQL vector options (HeatWave, etc.) are paid cloud services
- Losing vector search would require brute-force in-memory similarity in Node.js — workable at small scale but an architectural compromise

### Full-text search quality
- SQLite FTS5 provides BM25 ranking, prefix search, and snippet generation out of the box
- MySQL FULLTEXT exists but is less flexible and has different syntax
- FTS5 is a first-class citizen in SQLite, not an afterthought

### Zero infrastructure difference between local and production
- SQLite is a file — no server to run locally, no connection string differences
- MySQL requires a running server locally (Docker, XAMPP, etc.)
- The entire database is a single file (`nexus.db`) — trivial to back up and copy between environments

### Concurrency is not a concern at our scale
- A few hundred users doing research queries are not concurrent write-heavy
- SQLite's write lock (one writer at a time) is not a bottleneck for this use case
- Read concurrency in WAL mode is fine

### phpMyAdmin advantage is marginal
- Drizzle Kit Studio provides equivalent visual DB browsing locally
- SSH access to the `.db` file is sufficient for production inspection

## Consequences

- Cannot use phpMyAdmin for production DB management (acceptable — SSH + drizzle-kit studio locally)
- Must use WAL mode for SQLite in production (`PRAGMA journal_mode=WAL`) for better read concurrency
- DB backup = copy one file — simpler than `mysqldump`
- If the project ever grows to thousands of concurrent users or multi-GB DB, revisit this decision

## Revisit Trigger

Consider migrating to PostgreSQL (not MySQL — pgvector exists for Postgres) if:
- Concurrent write contention becomes measurable
- DB size exceeds 2GB
- Multi-server/replica deployment becomes necessary

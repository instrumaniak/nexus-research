# ADR 002 — Drizzle ORM over Prisma

## Status: Accepted

## Date: 2026-03

## Context

We need an ORM for NestJS + SQLite. The two main candidates evaluated were Prisma and Drizzle ORM. The deployment target is cPanel shared hosting running Node.js via Phusion Passenger.

## Decision

Use **Drizzle ORM** with `drizzle-kit` for migrations.

## Reasons

### Native binary problem on cPanel (decisive factor)
- Prisma relies on a native Rust query engine binary (`prisma-engines`, ~50MB)
- This binary must match the server's OS and glibc version exactly
- cPanel shared hosting environments frequently restrict execution of arbitrary native binaries
- `prisma generate` must run on every deploy — on restricted hosts this fails silently or loudly
- Drizzle is **pure JavaScript** — no native binaries, no download step, works on any Node.js environment

### SQLite FTS5 and sqlite-vec integration
- Prisma has no awareness of FTS5 virtual tables or sqlite-vec — all such queries require `prisma.$queryRaw`
- Drizzle's `sql` template tag integrates naturally alongside ORM queries — no context switching
- The KB service uses FTS5 and sqlite-vec heavily; the friction difference is meaningful

### Schema in TypeScript
- Drizzle schema is defined in a `.ts` file — same language as the rest of the codebase
- Prisma uses a separate `.prisma` DSL — one more language/file format to context-switch into

### Migration workflow is identical
- Both tools generate SQL migration files
- Both track applied migrations in a DB table
- Deploy command on server (`drizzle-kit migrate` vs `prisma migrate deploy`) — same workflow
- No practical difference in migration reliability once the binary problem is removed

## Trade-offs Accepted

- No Prisma Studio in production — use `drizzle-kit studio` locally instead
- Drizzle is newer — smaller community than Prisma, but docs are solid and API is stable
- TypeORM was also considered but rejected: known bugs with complex SQLite migrations, less active maintenance

## Migration Workflow

```bash
# Local: generate migration after schema change
npx drizzle-kit generate

# Server (SSH): apply pending migrations
npx drizzle-kit migrate
```

Both commands are pure Node.js. No binary downloads. Works on any cPanel Node.js environment.

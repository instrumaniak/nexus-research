# DB Migration

Generate and apply a Drizzle migration for a schema change.

## Instructions

1. Read `docs/spec/DATA_MODEL.md` to understand the current schema
2. Make the requested change to `backend/drizzle/schema.ts`
3. Run: `npx drizzle-kit generate` to create the migration file
4. Show me the generated SQL migration for review before applying
5. After confirmation, run: `npx drizzle-kit migrate`

## Rules
- Never edit existing migration files
- Never write migration SQL by hand — always use drizzle-kit generate
- Always commit schema.ts and the migration file together
- If adding FTS5 or sqlite-vec virtual tables, append raw SQL to the migration file manually

The requested change is: $ARGUMENTS

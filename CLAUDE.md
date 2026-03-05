# Nexus — Agent Context

> This file is the entry point for all coding agents (Claude Code, OpenCode, Codex, Cursor, etc.).
> Read this first. Follow all conventions listed here without exception.

## What this project is

Nexus is a self-hosted, multi-user AI research assistant.
Users ask questions, search the web, build a private knowledge base, and run deep research sessions.
Hosted on raziur.com (cPanel + Node.js). Designed for up to a few hundred users with approval-gated registration.

## Tech stack — non-negotiable

Do not suggest alternatives to these. Every choice has a recorded decision (see `docs/decisions/`).

| Layer             | Choice                                                                            | ADR                                                   |
| ----------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Backend framework | NestJS (TypeScript), Node.js 20+                                                  | —                                                     |
| ORM               | Drizzle ORM + drizzle-kit                                                         | [ADR 002](docs/decisions/002-drizzle-over-prisma.md)  |
| Database          | SQLite via better-sqlite3                                                         | [ADR 001](docs/decisions/001-sqlite-over-mysql.md)    |
| Vector search     | sqlite-vec extension                                                              | [ADR 001](docs/decisions/001-sqlite-over-mysql.md)    |
| Full-text search  | SQLite FTS5 (virtual table)                                                       | —                                                     |
| Frontend          | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui                           | —                                                     |
| State management  | Zustand                                                                           | —                                                     |
| AI API            | AI Provider (configurable: OpenRouter, Ollama, or any OpenAI-compatible endpoint) | [ADR 004](docs/decisions/004-openrouter-free-tier.md) |
| Embeddings        | @xenova/transformers, model: all-MiniLM-L6-v2 (local ONNX)                        | —                                                     |
| Auth              | @nestjs/jwt + bcrypt, phased rollout                                              | [AUTH spec](docs/spec/AUTH.md)                        |
| Email             | Nodemailer + cPanel SMTP (Phase 2)                                                | —                                                     |
| Logging           | Winston → SQLite logs table                                                       | —                                                     |
| Streaming         | Server-Sent Events (SSE) for all AI responses                                     | —                                                     |
| Language          | TypeScript / Node.js only                                                         | [ADR 003](docs/decisions/003-nodejs-over-python.md)   |

## Current phase

**Phase 1 — Auth + Core Chat**
See [`docs/phases/PHASE1-auth-chat.md`](docs/phases/PHASE1-auth-chat.md) for scope, user stories, and acceptance criteria.

## Project structure

```
nexus/
├── CLAUDE.md                   ← you are here
├── AGENTS.md                   ← identical to CLAUDE.md (multi-agent compatibility)
├── .claude/commands/           ← Claude Code custom slash commands
├── docs/
│   ├── spec/                   ← system design & technical specs
│   ├── decisions/              ← Architecture Decision Records (ADRs)
│   ├── phases/                 ← per-phase scope, stories, acceptance criteria
│   └── guides/                 ← how-to guides for recurring tasks
├── backend/
│   ├── drizzle/
│   │   ├── schema.ts           ← single source of truth for DB schema
│   │   └── migrations/         ← generated SQL files — never edit manually
│   ├── scripts/
│   │   └── create-superadmin.ts
│   └── src/
│       ├── agents/             ← orchestrator, search, reader, summarizer, kb, report-writer
│       ├── auth/               ← JWT strategy, guards, refresh tokens
│       ├── admin/              ← user management, logs, stats
│       ├── chat/               ← SSE controller, session management
│       ├── kb/                 ← knowledge base (FTS5 + sqlite-vec)
│       ├── embeddings/         ← @xenova/transformers wrapper
│       ├── email/              ← nodemailer service (Phase 2)
│       ├── logging/            ← Winston + SQLite transport
│       └── common/             ← guards, interceptors, pipes, filters
└── frontend/
    └── src/
        ├── pages/              ← Login, Register, Chat, KnowledgeBase, History, admin/*
        ├── components/
        ├── stores/             ← Zustand stores: auth, chat, kb
        └── api/                ← Axios client + interceptors
```

Full architecture detail: [`docs/spec/ARCHITECTURE.md`](docs/spec/ARCHITECTURE.md)

## Key conventions — always follow these

### Database

- All schema changes go in `backend/drizzle/schema.ts` first
- Run `npx drizzle-kit generate` to create the migration file — never write migration SQL by hand
- FTS5 and sqlite-vec virtual tables are created via raw SQL appended to the initial migration
- Never query the DB directly outside of a NestJS service

### NestJS

- Every feature is a NestJS module (controller + service + module file)
- Follow the pattern in [`docs/guides/ADDING_AN_AGENT.md`](docs/guides/ADDING_AN_AGENT.md) for new agent modules
- Use `@UseGuards(JwtAuthGuard, StatusGuard)` on all protected routes — both guards required
- Never put business logic in controllers — controllers handle HTTP only

### AI / Agents

- All AI responses stream via SSE — never return a full AI response in a single HTTP response
- All AI Provider calls go through `AiProviderService` — never call the API directly from a controller
- Agent pipelines are orchestrated by `OrchestratorService` — agents don't call each other directly

### Auth

- Phase 1 is email + password only — do not add OTP or OAuth until Phase 2/3
- Access token: 15m expiry. Refresh token: 7d, httpOnly cookie
- Ban enforcement: mark all refresh tokens revoked for that userId

### Environment

- All secrets come from `.env` — never hardcode
- Follow naming in `.env.example` exactly
- Free/open-source only — do not introduce paid APIs or services

### Code style

- Prettier handles all formatting — never manually format code
- Run `npm run format` to format, `npm run lint` to check
- Formatting is enforced on commit via husky + lint-staged
- Do not disable ESLint rules with inline comments without explaining why
- No `any` type without a comment explaining why (enforced by ESLint as warning)

## Testing conventions

- Backend tests use **Jest** — unit tests live next to the file they test (`*.spec.ts`)
- Frontend tests use **Vitest** + **React Testing Library** — test files live next to components (`*.test.tsx`)
- E2E tests use **Playwright** — live in `e2e/` at the repo root
- Always mock external API calls (AI Provider, Search Provider) at the service boundary — never let tests hit real APIs
- Use a separate SQLite test DB for integration tests — never the development `nexus.db`
- Test behaviour the user experiences, not internal implementation details
- Never test NestJS boilerplate (module wiring, decorators, simple passthrough CRUD)
- Every new NestJS service must have a corresponding `.spec.ts` file created at the same time
- See full strategy: [`docs/guides/TESTING.md`](docs/guides/TESTING.md)

## What NOT to do

- ❌ Do not suggest Prisma — see ADR 002
- ❌ Do not suggest MySQL or PostgreSQL — see ADR 001
- ❌ Do not suggest Python — see ADR 003
- ❌ Do not add paid APIs, services, or infrastructure
- ❌ Do not edit migration files after they have been committed
- ❌ Do not put logic in React components that belongs in Zustand stores or API layer
- ❌ Do not use `any` type in TypeScript without a comment explaining why
- ❌ Do not write tests that import and assert on internal component state — test what renders
- ❌ Do not hit real external APIs in any test — always mock at the service interface
- ❌ Do not share state between tests — each test must be independently runnable
- ❌ Do not skip writing the `.spec.ts` file when creating a new service

## Useful references

| What                       | Where                             |
| -------------------------- | --------------------------------- |
| Full system architecture   | `docs/spec/ARCHITECTURE.md`       |
| DB schema (human-readable) | `docs/spec/DATA_MODEL.md`         |
| Auth flows (all phases)    | `docs/spec/AUTH.md`               |
| Chat modes detail          | `docs/spec/CHAT_MODES.md`         |
| Full tech stack rationale  | `docs/spec/TECH_STACK.md`         |
| Phase 1 scope + stories    | `docs/phases/PHASE1-auth-chat.md` |
| Deploy sequence            | `docs/guides/DEPLOY.md`           |
| Local setup                | `docs/guides/LOCAL_SETUP.md`      |
| Testing strategy           | `docs/guides/TESTING.md`          |

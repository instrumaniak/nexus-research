# Tech Stack

Every choice listed here is final unless a new ADR is written. Do not suggest alternatives.

## Backend

| Package | Version | Purpose | Why |
|---|---|---|---|
| `@nestjs/core` | latest | Backend framework | Structured modules, DI, decorators — scales well for multi-agent services |
| `@nestjs/jwt` | latest | JWT signing/verification | First-class NestJS integration |
| `@nestjs/passport` | latest | Auth strategy abstraction | Clean separation of auth strategies |
| `@nestjs/serve-static` | latest | Serve React build | Single process serves frontend + API |
| `passport-local` | latest | Email/password strategy | Phase 1 auth |
| `passport-google-oauth20` | latest | Google OAuth strategy | Phase 3 auth — not installed until then |
| `bcrypt` | latest | Password hashing | Industry standard, cost factor 12 |
| `drizzle-orm` | latest | ORM | Pure JS, no native binary, SQLite FTS5/vec friendly — see ADR 002 |
| `drizzle-kit` | latest | Migrations | SQL migration generation + tracking |
| `better-sqlite3` | latest | SQLite driver | Synchronous, fast, well-maintained |
| `sqlite-vec` | latest | Vector search | Float32 BLOB storage + cosine similarity in SQLite |
| `@xenova/transformers` | latest | Local embeddings | all-MiniLM-L6-v2, 384-dim, ~23MB, fully offline |
| `axios` | latest | HTTP client | Agent web requests (search API, scraping) |
| `cheerio` | latest | HTML parsing | Article content extraction |
| `nodemailer` | latest | Email sending | cPanel SMTP — Phase 2 only |
| `otplib` | latest | OTP generation | 6-digit TOTP codes — Phase 2 only |
| `winston` | latest | Logging | Structured logs → SQLite logs table |
| `zod` | latest | Validation | Request body validation in pipes |

## Frontend

| Package | Version | Purpose |
|---|---|---|
| `react` | 18 | UI framework |
| `vite` | latest | Build tool + dev server |
| `typescript` | 5+ | Type safety |
| `tailwindcss` | latest | Utility-first styling |
| `shadcn/ui` | latest | Component library (built on Radix UI) |
| `zustand` | latest | Lightweight state management |
| `axios` | latest | HTTP client |
| `react-router-dom` | v6 | Client-side routing |
| `eventsource-parser` | latest | Parse SSE streams from backend |

## OpenRouter — Free Models in Use

| Task | Model ID | Notes |
|---|---|---|
| Orchestration & planning | `deepseek/deepseek-r1:free` | Best free reasoning model |
| Summarization | `meta-llama/llama-3.3-70b-instruct:free` | High quality, reliable |
| Quick Q&A / synthesis | `google/gemma-2-9b-it:free` | Fast, low latency |
| Report writing | `mistralai/mistral-7b-instruct:free` | Good structured output |

Model IDs may change as OpenRouter updates free tier availability.
Always check https://openrouter.ai/models?q=free before assuming a model is still free.

## Embeddings Model

- **Model:** `Xenova/all-MiniLM-L6-v2`
- **Dimensions:** 384
- **Size:** ~23MB (downloaded on first run, cached locally)
- **Location of cache:** `backend/.cache/transformers/`
- **Why this model:** Good quality/size trade-off, widely used, well-supported by @xenova/transformers

## Environment Variables

See `.env.example` in the repo root for the full list.
Never add a new env var without adding it to `.env.example` first.

## Node.js Version

- **Required:** Node.js 20+
- **Reason:** @xenova/transformers requires modern Node.js for ONNX runtime
- **Check:** `node --version` before running

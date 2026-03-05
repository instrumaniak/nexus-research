# Local Setup

## Prerequisites

- Node.js 20+ (`node --version`)
- npm 10+
- Git

No database server needed. SQLite is a file.

## First-time setup

```bash
# Clone the repo
git clone <repo-url>
cd nexus

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and fill in:
#   JWT_ACCESS_SECRET (generate with: openssl rand -hex 32)
#   JWT_REFRESH_SECRET (generate with: openssl rand -hex 32)
#   AI_PROVIDER_API_KEY (get from openrouter.ai — free account, or leave blank for Ollama)
#   BRAVE_SEARCH_API_KEY (optional — get from brave.com/search/api)
```

## Database setup

```bash
cd backend

# Run migrations (creates nexus.db and all tables)
npx drizzle-kit migrate

# Create your superadmin account
npx ts-node scripts/create-superadmin.ts \
  --username admin \
  --email your@email.com \
  --password 'YourPassword!'
```

## Run locally

```bash
# Terminal 1 — backend (port 3000)
cd backend
npm run start:dev

# Terminal 2 — frontend (port 5173)
cd frontend
npm run dev
```

Open: http://localhost:5173

The frontend proxies `/api/*` to `http://localhost:3000` (configured in `vite.config.ts`).

## Embeddings model download

On first KB save or search, `@xenova/transformers` downloads the `all-MiniLM-L6-v2` model (~23MB) and caches it in `backend/.cache/transformers/`. Subsequent runs use the cache — no internet required.

## Visual DB browser

```bash
cd backend
npx drizzle-kit studio
# Opens at http://localhost:4983
```

## Useful dev commands

```bash
# Generate a new migration after schema changes
npx drizzle-kit generate

# Apply pending migrations
npx drizzle-kit migrate

# Type-check backend
npx tsc --noEmit

# Type-check frontend
cd frontend && npx tsc --noEmit
```

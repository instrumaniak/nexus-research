# Deployment Guide — raziur.com (cPanel)

## One-time server setup

```bash
# SSH into server
ssh user@raziur.com

# Verify Node.js version
node --version   # must be 20+

# Install pm2 globally
npm install -g pm2

# Clone the repo
git clone <repo-url> ~/nexus
cd ~/nexus/backend

# Install dependencies
npm install

# Set environment variables in cPanel panel (not in a file)
# cPanel → Node.js → Environment Variables → add all vars from .env.example

# Run initial migration
npx drizzle-kit migrate

# Create superadmin (run once only)
npx ts-node scripts/create-superadmin.ts \
  --username admin \
  --email admin@raziur.com \
  --password 'StrongPassword!'

# Build
cd ~/nexus/backend && npm run build
cd ~/nexus/frontend && npm install && npm run build
cp -r ~/nexus/frontend/dist ~/nexus/backend/public

# Start with pm2
pm2 start ~/nexus/backend/dist/main.js --name nexus
pm2 save   # persist across reboots
```

**cPanel Node.js app settings:**
- Application root: `/home/<user>/nexus/backend`
- Application URL: your domain
- Application startup file: `dist/main.js`

---

## Standard deploy (new version)

Run these steps every time you deploy a code update:

```bash
# SSH into server
ssh user@raziur.com
cd ~/nexus

# 1. Stop service
pm2 stop nexus

# 2. Pull latest code
git pull

# 3. Install any new dependencies
cd backend && npm install
cd ../frontend && npm install

# 4. Apply pending DB migrations
cd ../backend
npx drizzle-kit migrate

# 5. Build
npm run build
cd ../frontend && npm run build
cp -r dist ../backend/public

# 6. Restart service
cd ../backend
pm2 start nexus
```

Check it's running: `pm2 status`
View logs: `pm2 logs nexus`

---

## Rollback

```bash
pm2 stop nexus
git log --oneline -10     # find the commit to roll back to
git checkout <commit-hash>
npm run build
cd ../frontend && npm run build && cp -r dist ../backend/public
cd ../backend
pm2 start nexus
```

Note: DB migrations are not automatically reversed on rollback. If a migration must be rolled back, write a compensating migration manually.

---

## Backup

```bash
# Copy the SQLite file (safest when app is stopped or in WAL mode)
cp ~/nexus/backend/nexus.db ~/backups/nexus-$(date +%Y%m%d).db
```

Schedule a cron job in cPanel for daily backups.

---

## Environment variables

All secrets are set in the cPanel Node.js environment panel — never committed to git.

| Variable | Description |
|---|---|
| `JWT_ACCESS_SECRET` | Long random string — generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Different long random string |
| `JWT_ACCESS_EXPIRY` | `15m` |
| `JWT_REFRESH_EXPIRY` | `7d` |
| `DATABASE_PATH` | `./nexus.db` |
| `OPENROUTER_API_KEY` | From openrouter.ai |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` |
| `BRAVE_SEARCH_API_KEY` | Optional — DuckDuckGo fallback if absent |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `LOG_LEVEL` | `info` |
| `LOG_RETENTION_DAYS` | `30` |
| `SMTP_HOST` | Phase 2 — `mail.raziur.com` |
| `SMTP_PORT` | Phase 2 — `587` |
| `SMTP_USER` | Phase 2 — `noreply@raziur.com` |
| `SMTP_PASS` | Phase 2 |
| `SMTP_FROM` | Phase 2 — `Nexus <noreply@raziur.com>` |
| `GOOGLE_CLIENT_ID` | Phase 4 |
| `GOOGLE_CLIENT_SECRET` | Phase 4 |
| `GOOGLE_CALLBACK_URL` | Phase 4 |

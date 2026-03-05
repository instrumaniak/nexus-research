# Phase 4 — Google OAuth + Production Deployment

## Status: NOT STARTED

## Prerequisite: Phase 3 complete

## Scope

Add Google OAuth sign-in and complete the production deployment to raziur.com.

## User Stories

- As a Visitor, I want to sign in with my Google account
- As a Visitor, I want to see a clear pending message if my Google account awaits approval
- As a User registered with email/password, I want to link my Google account

## New Packages (install in Phase 4 only)

```bash
npm install passport-google-oauth20 @types/passport-google-oauth20
```

## Schema Additions

- Add `google_id` column to `users` table (already stubbed as nullable — generate migration)

## New API Endpoints

```
GET    /auth/google                  redirect to Google consent
GET    /auth/google/callback         OAuth callback handler
POST   /auth/link-google             link Google to existing account (optional)
```

## New Environment Variables

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://raziur.com/api/auth/google/callback
```

## Deployment Checklist

- [ ] `npm run build` succeeds locally for both backend and frontend
- [ ] `frontend/dist/` copied into `backend/public/`
- [ ] `ServeStaticModule` configured in `AppModule`
- [ ] All `.env` variables set in cPanel environment panel
- [ ] `pm2` installed globally on server
- [ ] `pm2 start backend/dist/main.js --name nexus` tested
- [ ] `npx drizzle-kit migrate` runs without error on server
- [ ] `npx ts-node backend/scripts/create-superadmin.ts` run once
- [ ] cPanel Node.js app entry point set to `backend/dist/main.js`
- [ ] Domain routes to app correctly
- [ ] HTTPS working (cPanel SSL)

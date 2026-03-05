# Phase 1 — Auth + Core Chat

## Status: IN PROGRESS

## Scope

Build the foundational layer: working auth system, web search chat mode, session history.
No KB, no deep research, no OTP email, no Google OAuth, no admin panel yet.

## Deliverables

- [ ] Monorepo scaffolded (NestJS backend + Vite frontend)
- [ ] Drizzle schema + initial migration (users, refresh_tokens, sessions, messages, logs tables)
- [ ] Auth: register, login, JWT + refresh tokens, status guard
- [ ] Superadmin CLI script (`create-superadmin.ts`)
- [ ] Web Search mode: search → scrape → summarise → synthesise → SSE stream
- [ ] URL paste detection + auto-summarise
- [ ] Session auto-save + history sidebar
- [ ] Admin panel: pending approvals + basic user table (approve / ban)
- [ ] Login + Register UI pages
- [ ] Chat UI: mode selector (3 modes shown, Web Search functional, others disabled with "coming soon")
- [ ] History page: list sessions, re-open, continue

## User Stories

### Registration & Login
- As a Visitor, I want to register with my email and password so that I can request access to Nexus
- As a Visitor, I want to see a clear message after registering that my account is pending approval
- As a Visitor, I want to log in with my email and password to access my research assistant
- As a Visitor, I want to see a specific error if my account is pending or banned when I try to log in
- As a User, I want to be logged out when I click sign out so that my session is terminated securely
- As a User, I want my session to stay alive across browser refreshes without logging in again

### Web Search Mode
- As a User, I want to type a question and get an AI-synthesised answer sourced from the web
- As a User, I want to see the sources (URLs + titles) behind every answer
- As a User, I want to see a live progress feed while my query is being processed
- As a User, I want to paste a URL into the chat and get a structured summary of that article

### Chat Experience
- As a User, I want to select between Web Search, KB Search, and Deep Research modes (KB and Deep Research disabled in Phase 1)
- As a User, I want my conversation to be saved automatically as a session
- As a User, I want each session to be given an auto-generated title based on my first message

### History
- As a User, I want to see a list of all my past research sessions in a sidebar
- As a User, I want to re-open any past session and read the full conversation
- As a User, I want to continue asking questions within a re-opened session

### Superadmin — Baseline
- As a Superadmin, I want my account created via a terminal command (never via UI)
- As a Superadmin, I want to see a list of all pending users in the admin panel
- As a Superadmin, I want to approve a pending user with one click
- As a Superadmin, I want to ban an active user with immediate session invalidation
- As a Superadmin, I want to unban a previously banned user

## Acceptance Criteria

### Auth
- [ ] Registering with an existing email returns a clear error
- [ ] Registering successfully shows "Account pending approval" — user cannot log in yet
- [ ] Logging in as PENDING user returns 403 with "Account pending approval"
- [ ] Logging in as BANNED user returns 403 with "Account suspended"
- [ ] Logging in as ACTIVE user returns access token and sets refresh cookie
- [ ] Access token expires after 15 minutes — frontend auto-refreshes transparently
- [ ] Logging out revokes the refresh token
- [ ] Banning a user invalidates all their active sessions immediately

### Web Search
- [ ] Query returns a synthesised answer with at least 2 source URLs
- [ ] SSE progress steps appear in order: searching → reading → summarising → done
- [ ] Pasting a URL returns a structured summary (title + bullets + key takeaways)
- [ ] Failed scrape falls back gracefully (uses snippet from search result)

### Sessions & History
- [ ] Every query+response pair is saved to the correct session
- [ ] Session title is auto-generated from the first user message (truncated to 60 chars)
- [ ] History sidebar lists sessions ordered by most recent first
- [ ] Re-opening a session renders full message history
- [ ] Continuing from a re-opened session appends new messages to the same session

### Admin
- [ ] Superadmin can see all PENDING users
- [ ] Approve sets status to ACTIVE
- [ ] Ban sets status to BANNED and revokes all refresh tokens for that user
- [ ] Admin routes return 403 for non-superadmin users

## API Endpoints (Phase 1)

```
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

POST   /chat/stream          (SSE — Web Search mode)
GET    /chat/sessions        (list user's sessions)
GET    /chat/sessions/:id    (get session with messages)

GET    /admin/users          (superadmin only)
PATCH  /admin/users/:id/approve
PATCH  /admin/users/:id/ban
PATCH  /admin/users/:id/unban
```

## Out of Scope for Phase 1

- Knowledge Base (Phase 2)
- Deep Research mode (Phase 2)
- Full admin panel with logs and stats (Phase 2)
- Email OTP verification (Phase 3)
- Google OAuth (Phase 4)
- Password reset (Phase 3)

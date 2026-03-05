# Phase 2 — Knowledge Base + Admin Panel + Deep Research

## Status: NOT STARTED

## Prerequisite: Phase 1 complete and deployed

## Scope

Add personal knowledge base with hybrid search, full admin panel, Deep Research mode, and system logging.

## User Stories

### Knowledge Base
- As a User, I want to save any assistant response to my KB with one click
- As a User, I want to save a URL directly to my KB with auto-summarisation
- As a User, I want to search my KB by keyword
- As a User, I want semantic search in my KB to find items even without exact words
- As a User, I want to add tags to KB items to organise my research by topic
- As a User, I want to filter my KB by tag
- As a User, I want to expand a KB item to read its full content and source
- As a User, I want to delete KB items I no longer need

### KB Search Mode
- As a User, I want to switch to KB Search mode and get an answer from my saved research
- As a User, I want the assistant to tell me when KB search finds no relevant results

### Deep Research Mode
- As a User, I want to submit a complex question and receive a structured multi-section report
- As a User, I want to see a live step-by-step progress feed during deep research
- As a User, I want the report to include cited sources for each section

### Admin Panel — Full
- As a Superadmin, I want to view all users in a table filterable by status
- As a Superadmin, I want to see each user's registration date and last login
- As a Superadmin, I want to view the system log in the admin panel
- As a Superadmin, I want to filter logs by level, user, context, and date range
- As a Superadmin, I want to see system stats (user counts, queries, API calls, KB items)

## New API Endpoints

```
POST   /kb/save
GET    /kb/items              (user's KB, paginated)
GET    /kb/search?q=          (FTS5 + semantic hybrid)
GET    /kb/items/:id
DELETE /kb/items/:id

POST   /chat/stream/deep-research   (SSE — Deep Research mode)

GET    /admin/logs
GET    /admin/stats
```

## Schema Additions

- `kb_items` table (already in schema.ts, migration pending)
- `kb_items_fts` virtual table (FTS5)
- `kb_items_vec` virtual table (sqlite-vec)
- `logs` table (already in schema.ts)

## Out of Scope for Phase 2

- Email OTP (Phase 3)
- Google OAuth (Phase 4)

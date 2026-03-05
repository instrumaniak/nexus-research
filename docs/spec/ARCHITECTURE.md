# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                  │
│  Login / Register / Chat / KB / History / Admin          │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP + SSE
┌───────────────────▼─────────────────────────────────────┐
│  NestJS API  (backend/src/)                              │
│                                                          │
│  AuthModule   ChatModule   KbModule   AdminModule        │
│       │            │           │           │             │
│       └────────────┴───────────┴───────────┘             │
│                        │                                 │
│              OrchestratorService                         │
│           ┌──────┬─────┴──────┬──────────┐              │
│      Search  Reader  Summarizer  KbAgent  ReportWriter   │
└──────┬─────┴──┬────┴───┬───────┴──┬──────┴──┬───────────┘
       │        │        │          │          │
  Brave/DDG  Cheerio  AI Provider sqlite-vec  AI Provider
                        (LLM)     + FTS5      (LLM)
                            │
                      ┌─────▼──────┐
                      │  nexus.db  │
                      │  (SQLite)  │
                      └────────────┘
```

## Request Lifecycle — Web Search Mode

```
User submits query
  → ChatController (POST /chat/stream)
  → JwtAuthGuard + StatusGuard
  → ChatService.handleQuery()
  → OrchestratorService.runWebSearch(query)
      → SearchAgent.search(query)        [Brave API / DDG]
      → ReaderAgent.scrape(url[])        [Axios + Cheerio]
      → SummarizerAgent.summarize(text)  [AI Provider]
      → SynthesizerAgent.synthesize()    [AI Provider]
  → SSE stream tokens back to frontend
  → ChatService.saveSession(messages)   [Drizzle → SQLite]
```

## Request Lifecycle — KB Search Mode

```
User submits query (KB Search mode)
  → OrchestratorService.runKbSearch(query, userId)
      → EmbeddingsService.embed(query)         [@xenova/transformers]
      → KbService.semanticSearch(vector)       [sqlite-vec]
      → KbService.keywordSearch(query)         [FTS5]
      → KbService.hybridRank(semantic, keyword)
      → SynthesizerAgent.synthesize(kbResults)  [AI Provider]
  → SSE stream back to frontend
```

## Request Lifecycle — Deep Research Mode

```
User submits query (Deep Research mode)
  → OrchestratorService.runDeepResearch(query)
      → AI Provider: decompose query into 3-5 sub-questions
      → For each sub-question (parallel):
          → SearchAgent.search()
          → ReaderAgent.scrape()
          → SummarizerAgent.summarize()
      → OrchestratorService: check coverage, add searches if gaps found
      → ReportWriterAgent.writeReport(allSummaries)  [AI Provider]
  → SSE stream progress steps + final report
```

## Module Map

| Module | Controller | Service | Description |
|---|---|---|---|
| AuthModule | AuthController | AuthService | Register, login, token refresh, logout |
| AdminModule | AdminController | AdminService | User management, approve/ban, logs, stats |
| ChatModule | ChatController | ChatService | SSE streaming, session + message persistence |
| KbModule | KbController | KbService | KB CRUD, FTS5 + semantic search |
| Agents | — | OrchestratorService | Coordinates all agent calls |
| Agents | — | SearchAgent | Brave Search / DuckDuckGo |
| Agents | — | ReaderAgent | Axios + Cheerio scraper |
| Agents | — | SummarizerAgent | AI Provider summarization |
| Agents | — | SynthesizerAgent | AI Provider synthesis |
| Agents | — | ReportWriterAgent | AI Provider deep research report |
| Agents | — | KbAgent | KB lookup within agent pipeline |
| EmbeddingsModule | — | EmbeddingsService | @xenova/transformers wrapper |
| LoggingModule | — | LoggingService | Winston + SQLite transport |
| EmailModule | — | EmailService | Nodemailer + cPanel SMTP (Phase 2) |
| AiProviderModule | — | AiProviderService | All LLM API calls (configurable provider) |

## Frontend Route Map

| Route | Component | Guard |
|---|---|---|
| `/login` | Login.tsx | Redirect to /chat if already authenticated |
| `/register` | Register.tsx | Redirect to /chat if already authenticated |
| `/chat` | Chat.tsx | RequireAuth |
| `/chat/:sessionId` | Chat.tsx | RequireAuth |
| `/kb` | KnowledgeBase.tsx | RequireAuth |
| `/history` | History.tsx | RequireAuth |
| `/admin` | AdminLayout.tsx | RequireAuth + RequireSuperadmin |
| `/admin/users` | AdminUsers.tsx | RequireAuth + RequireSuperadmin |
| `/admin/logs` | AdminLogs.tsx | RequireAuth + RequireSuperadmin |
| `/admin/stats` | AdminStats.tsx | RequireAuth + RequireSuperadmin |

## Deployment Topology (cPanel)

```
raziur.com (cPanel)
├── Node.js app (Phusion Passenger)
│   └── backend/dist/main.js         ← NestJS entry point
│       └── serves frontend/dist/    ← React static build (ServeStaticModule)
├── nexus.db                          ← SQLite file, lives in app directory
└── .env                              ← Secrets set via cPanel env panel
```

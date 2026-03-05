# Testing Guide

## Philosophy

The goal is **high confidence with sustainable effort** — not 100% coverage for its own sake.
Tests should catch regressions and document intent, not become a maintenance burden.

Rules of thumb:
- Test behaviour, not implementation
- Test the things that would hurt most if they broke (auth, agent pipelines, KB ranking)
- Mock external API calls at the service boundary — never in the middle of logic
- Don't test NestJS boilerplate (module wiring, decorators, simple CRUD with no logic)

---

## Tooling

| Layer | Tool | Why |
|---|---|---|
| Backend unit + integration | **Jest** + NestJS testing module | Ships with NestJS, zero config |
| Backend HTTP assertions | **Supertest** | Test full request/response cycle |
| Frontend component tests | **Vitest** + **React Testing Library** | Vite-native, fast, tests behaviour not DOM details |
| Frontend E2E | **Playwright** | Full browser automation for critical user journeys |
| Backend coverage | `jest --coverage` | Identify untested paths |
| Frontend coverage | `vitest --coverage` | Same for frontend |

---

## Backend Testing (NestJS + Jest)

### File locations

```
backend/src/
├── auth/
│   ├── auth.service.ts
│   └── auth.service.spec.ts       ← unit test lives next to the file it tests
├── agents/
│   ├── orchestrator/
│   │   ├── orchestrator.service.ts
│   │   └── orchestrator.service.spec.ts
│   └── search/
│       ├── search.agent.ts
│       └── search.agent.spec.ts
└── test/                          ← integration + E2E tests
    ├── auth.e2e.spec.ts
    └── chat.e2e.spec.ts
```

### Unit tests — what to test

**Auth (`auth.service.spec.ts`)**
- Register with new email → user created with PENDING status
- Register with duplicate email → throws conflict error
- Login with correct credentials + ACTIVE status → returns tokens
- Login with correct credentials + PENDING status → throws 403
- Login with correct credentials + BANNED status → throws 403
- Login with wrong password → throws 401
- Ban user → all refresh tokens marked revoked
- Refresh token rotation → old token revoked, new token issued

**Orchestrator (`orchestrator.service.spec.ts`)**
- Web Search mode → calls SearchAgent, ReaderAgent, SummarizerAgent, SynthesizerAgent in order
- KB Search mode → calls KbService, falls back to web search if 0 results
- Deep Research mode → decomposes query, runs parallel sub-searches, calls ReportWriterAgent

**Each agent (e.g. `search.agent.spec.ts`)**
- Returns correctly shaped results
- Handles empty results gracefully
- Handles provider timeout/error gracefully

**KB Service (`kb.service.spec.ts`)**
- Hybrid ranking: semantic + keyword results merged correctly via RRF
- Items from other users are never returned
- Empty result set handled without error

**Guards**
- `JwtAuthGuard`: valid token passes, expired token rejects, missing token rejects
- `StatusGuard`: ACTIVE passes, PENDING rejects, BANNED rejects
- `RolesGuard`: SUPERADMIN passes admin routes, USER is rejected

### Mocking external calls

Every external dependency is injected via NestJS DI and mocked in tests.
Never let a test hit a real API (OpenRouter, Brave Search, etc.).

```typescript
// Example: mocking AiProviderService in orchestrator tests
const mockAiProvider = {
  complete: jest.fn().mockResolvedValue('mocked response'),
  stream: jest.fn(),
};

const module = await Test.createTestingModule({
  providers: [
    OrchestratorService,
    { provide: AiProviderService, useValue: mockAiProvider },
    { provide: SearchAgent, useValue: mockSearchAgent },
    // ...
  ],
}).compile();
```

### Integration tests (HTTP layer)

Use a real in-memory SQLite test DB — not mocked. Spin up the full NestJS app with Supertest.

```typescript
// backend/test/auth.e2e.spec.ts
describe('Auth (e2e)', () => {
  it('POST /auth/register → 201 + pending message', ...);
  it('POST /auth/login with PENDING account → 403', ...);
  it('POST /auth/login with ACTIVE account → 200 + tokens', ...);
  it('GET /admin/users without superadmin → 403', ...);
});
```

Use a separate test database file: `DATABASE_PATH=./test.db` set in test setup.
Clean the DB between tests using `beforeEach` teardown.

### Running backend tests

```bash
cd backend

# Unit tests
npm test

# Unit tests in watch mode
npm run test:watch

# E2E / integration tests
npm run test:e2e

# Coverage report
npm run test:cov
```

---

## Frontend Testing (Vitest + React Testing Library)

### File locations

```
frontend/src/
├── pages/
│   ├── Login.tsx
│   └── Login.test.tsx             ← test next to component
├── components/
│   ├── ModeSelector.tsx
│   └── ModeSelector.test.tsx
└── stores/
    ├── auth.store.ts
    └── auth.store.test.ts
```

### Component tests — what to test

Test what the **user sees and does**, not internal state or implementation.

**Login page**
- Empty form submission shows validation errors
- Wrong credentials shows error message from API
- Successful login redirects to /chat
- Pending account shows "pending approval" message

**Mode selector**
- Clicking Web Search sets mode correctly
- KB Search and Deep Research show "coming soon" in Phase 1
- Selected mode is visually indicated

**Chat interface**
- Submitting a query emits the correct mode to the API
- SSE progress steps render in order (searching → reading → summarising → done)
- Sources list renders with correct URLs and titles
- "Save to KB" button appears on assistant messages

**Admin user table**
- Pending users appear in the correct section
- Approve button calls the correct API endpoint
- Ban button triggers confirmation before calling API

**Zustand stores**
- Auth store: login sets token, logout clears token
- Chat store: session is created and messages appended correctly

### Example test structure

```typescript
// Login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Login } from './Login';

describe('Login page', () => {
  it('shows error when submitting empty form', async () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('shows pending message when account is not approved', async () => {
    // mock API to return 403 with pending message
    // assert the correct UI message is shown
  });
});
```

### Running frontend tests

```bash
cd frontend

# Component tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

---

## E2E Tests (Playwright)

### What to cover

Keep to the most critical user journeys only — 5 to 8 tests maximum per phase.

**Phase 1 E2E tests:**
- Visitor registers → sees pending message → cannot log in
- Superadmin logs in → approves user → user can now log in
- Approved user logs in → submits web search query → sees progress steps → sees answer with sources
- Logged-in user logs out → cannot access /chat → redirected to /login
- Banned user's active session → next request → redirected to login

### File location

```
e2e/
├── auth.spec.ts
├── chat.spec.ts
└── playwright.config.ts
```

### Running E2E tests

```bash
# From repo root
npx playwright test

# Headed mode (see the browser)
npx playwright test --headed

# Specific file
npx playwright test e2e/auth.spec.ts
```

E2E tests run against a locally running instance of the full app.
Use a dedicated test DB (`TEST_DATABASE_PATH=./e2e-test.db`) reset before each run.

---

## Phased Testing Rollout

Don't write tests for everything upfront. Build the infrastructure in Phase 1, grow coverage with each phase.

| Phase | Testing focus |
|---|---|
| Phase 1 | Auth unit + integration tests. Jest + Supertest set up. Vitest set up. 2-3 Playwright E2E for auth flow. |
| Phase 2 | KB hybrid ranking unit tests. Agent pipeline unit tests with mocks. KB search E2E. |
| Phase 3 | OTP flow integration tests. Email service mock. |
| Phase 4 | Full regression suite before production deploy. |

---

## CI Consideration (Future)

When you add GitHub Actions, the test pipeline will be:

```
push → install deps → run backend unit tests → run frontend tests → run E2E tests → deploy
```

For now, run tests locally before each commit. A pre-commit hook via `husky` can enforce this:

```bash
# runs on every git commit
npm test --passWithNoTests
```

# ADR 005 — Zustand over Redux / React Context

| Field       | Value                          |
|-------------|--------------------------------|
| **Status**  | Accepted                       |
| **Date**    | 2026-03-05                     |
| **Author**  | Raziur Rahman                  |
| **Affects** | `frontend/src/stores/`         |

---

## Context

Nexus requires client-side state management across three distinct domains:

- **Auth state** — current user, access token, login/logout lifecycle
- **Chat state** — active session, message history, SSE streaming (token-by-token AI responses), mode selection
- **KB state** — knowledge base item list, search results, save/delete status

Two alternative approaches were evaluated before settling on Zustand: **React Context** (which the lead developer has prior experience with) and **Redux** (also familiar from previous projects). The decision was explicitly re-evaluated at the start of Phase 1 to confirm it was the right fit rather than a default assumption.

---

## Decision

Use **Zustand** as the sole state management library for the Nexus frontend.

---

## Rationale

### Why not Redux

Redux was ruled out on ceremony alone. Nexus is a small application targeting a few hundred users. The Redux pattern — actions, reducers, selectors, dispatch, middleware — adds significant boilerplate for a chat UI that has three stores. The developer experience cost outweighs the benefits Redux brings at enterprise scale. This is not a large team with a complex shared codebase; there is no need for Redux DevTools-level auditability or time-travel debugging as a baseline requirement.

### Why not React Context

React Context was seriously considered given existing familiarity. For a small app, Context is often the right call. However, Nexus has one specific characteristic that makes Context a poor fit: **SSE token streaming**.

During an AI response, the backend emits tokens at high frequency via Server-Sent Events. Each token appends to the active message in chat state. With React Context, every token update triggers a re-render of every component subscribed to that context — including the sidebar, mode selector, session list, and any other UI consuming chat context. This produces a measurable and visible performance degradation during streaming, which is the core interaction of the application.

Zustand solves this through **slice-level subscriptions**. A component subscribes only to the specific piece of state it reads. The message bubble component re-renders on each token; the sidebar does not. This is the decisive technical reason Context was not chosen.

Outside of streaming, Context would be perfectly adequate. If SSE streaming were ever removed from the design, this decision should be revisited.

### Why Zustand

- **Slice subscriptions** prevent unnecessary re-renders during high-frequency SSE updates
- **No provider boilerplate** — stores are plain functions, importable anywhere without wrapping the component tree
- **Minimal API surface** — `create`, `set`, `get`, and `subscribe` cover all use cases in Nexus
- **Familiar mental model** — state + actions in one place, close to how Context stores are often structured anyway
- **TypeScript-native** — full type inference on store shape and actions with no extra setup
- **Tiny bundle** (~1.1KB gzipped) — no meaningful size cost

---

## Store Map

Three stores will be created under `frontend/src/stores/`:

| File | State Managed |
|---|---|
| `auth.store.ts` | `user`, `accessToken`, `isAuthenticated`, `login()`, `logout()` |
| `chat.store.ts` | `activeSession`, `messages`, `streamingContent`, `isStreaming`, `mode`, `sessions[]` |
| `kb.store.ts` | `items[]`, `searchResults[]`, `isLoading`, `save()`, `delete()` |

---

## Consequences

- All state that would otherwise live in Context or Redux goes into these three Zustand stores
- Components must not hold derived state locally if it belongs in a store — keep the stores as the single source of truth
- The Axios interceptor in `frontend/src/api/` reads `accessToken` directly from the auth store — no prop drilling required
- If a fourth domain of state is needed in a later phase, a new store file is added — stores do not need to be merged

---

## Alternatives Considered

| Option | Verdict | Reason |
|---|---|---|
| Redux Toolkit | Rejected | Excessive boilerplate for app scale; no meaningful benefit over Zustand here |
| React Context | Rejected | Re-render behaviour during SSE token streaming is a material UX problem |
| Jotai | Not evaluated | Zustand's store model maps more naturally to the three-domain structure of this app; Jotai's atomic model offers no advantage here |
| TanStack Query | Partial consideration | Useful for server state (session list, KB items) — may be added alongside Zustand in a later phase for server cache management, but not a replacement for client state |

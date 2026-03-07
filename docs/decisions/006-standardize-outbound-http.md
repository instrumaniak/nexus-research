# ADR 006 — Standardize Outbound HTTP in Backend

## Status: Accepted

## Date: 2026-03

## Context

Nexus makes outbound HTTP requests to third-party services as part of the agent pipeline:

- `SearchAgent` calls search providers
- `ReaderAgent` fetches HTML pages for scraping
- `AiProviderService` calls the configured AI provider

The current implementation mixes transport styles:

- `SearchAgent` uses global `fetch`
- `ReaderAgent` uses direct `axios`
- `AiProviderService` uses global `fetch`

This mixed state is workable in the short term, but it is not a good long-term standard. It spreads transport concerns across feature code, creates inconsistent testing patterns, and makes it harder to centralize timeouts, headers, error normalization, retries, and observability.

NestJS provides `HttpModule` / `HttpService` as the framework-integrated outbound HTTP mechanism. Nexus should choose a single default approach and define the narrow cases where a lower-level transport is acceptable.

## Decision

Use a single shared outbound HTTP abstraction for all backend outbound HTTP requests.

For normal request/response HTTP calls, that abstraction is implemented with NestJS `HttpModule` / `HttpService` from `@nestjs/axios`.

Feature code must not call global `fetch` directly and must not import `axios` directly. Agents, controllers, and feature services should depend on the shared outbound HTTP service instead of raw transport libraries.

Streaming SSE-style responses are the only allowed exception. If streaming is materially simpler or more reliable with `fetch`, it may be used, but only inside the shared outbound HTTP layer. Even in that case, feature code still depends on the shared abstraction, not on `fetch` itself.

This means:

- `SearchAgent` should use the shared outbound HTTP service
- `ReaderAgent` should use the shared outbound HTTP service
- `AiProviderService.complete()` should use the shared outbound HTTP service
- `AiProviderService.stream()` may use `fetch` internally only through the shared outbound HTTP service

## Reasons

### Consistency across the codebase

One outbound HTTP standard is easier to reason about than a mix of `fetch` and direct `axios`. New integrations should follow a single pattern by default.

### Better dependency injection and testability

Nest-managed providers are easier to mock than scattered transport calls. Unit tests for agents and services should mock one shared HTTP abstraction instead of mocking `fetch` in some places and `axios` in others.

### Centralized transport policy

Timeouts, default headers, retry policy, redirect behavior, error formatting, and logging should be defined once. A shared outbound HTTP layer provides one place to enforce those concerns.

### Better separation of concerns

Agents and services should focus on business logic: searching, reading, summarizing, synthesizing. Transport details belong in infrastructure code.

### NestJS-native default

Nest already provides `HttpModule` / `HttpService` as the framework-integrated HTTP client mechanism. Using it as the default keeps outbound HTTP aligned with the rest of the Nest dependency injection model.

### Streaming is a valid special case

SSE/token streaming is different from normal request/response HTTP. In Node.js 20+, direct stream parsing with `fetch` and `ReadableStream` is often simpler than forcing the same path through Axios-based abstractions. That is a transport concern, not a reason to expose `fetch` directly to feature code.

## Consequences

- Direct `axios` imports in feature code are no longer allowed
- Direct global `fetch` in feature code is no longer allowed
- New outbound integrations must go through the shared outbound HTTP service
- Unit tests for agents and feature services should mock the shared outbound HTTP service, not transport libraries
- Transport-specific parsing and failure behavior should be tested once in the shared infrastructure layer
- Refactoring existing outbound callers to this standard is now required technical alignment work, not an optional cleanup

## Exceptions

The only approved exception is streaming SSE/token transport.

`fetch` may be used for streaming responses only when both conditions are true:

1. The code lives inside the shared outbound HTTP abstraction
2. The caller still depends on the abstraction rather than on `fetch`

No other feature module, service, or agent may introduce direct `fetch` or direct `axios` usage without a new ADR.

## Revisit Trigger

Revisit this decision if:

- NestJS introduces a first-class streaming HTTP client that cleanly replaces the streaming exception
- Nexus adopts a different transport stack consistently across the entire backend
- Future runtime or hosting constraints make Axios-based transport a poor default

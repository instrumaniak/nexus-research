# ADR 003 — Node.js / NestJS over Python / FastAPI

## Status: Accepted

## Date: 2026-03

## Context

Nexus has a strong AI/agent core. Python is the dominant language in the AI/ML ecosystem (LangChain, LlamaIndex, sentence-transformers, etc.). The developer has strong Node.js/TypeScript experience and is familiar with but less confident in Python.

## Decision

Use **Node.js with NestJS (TypeScript)** for the backend.

## Reasons

### Developer familiarity is the primary factor
- The developer has professional production experience in Node.js/TypeScript
- Moving slower in Python increases the risk of not finishing the project
- A shipped Node.js app beats an unfinished Python app

### The Python AI ecosystem advantage is overstated for this use case
- Nexus uses OpenRouter API (HTTP calls) — language-agnostic
- Embeddings use `@xenova/transformers` (a well-maintained ONNX port of sentence-transformers)
- Web scraping with Cheerio is comparable to BeautifulSoup4
- The agent patterns needed (orchestrator + specialist agents) are straightforward HTTP + async — no LangChain required

### NestJS is a strong fit for multi-agent services
- Dependency injection makes agent services easy to compose and test
- Module system maps naturally to agent separation (SearchAgent, ReaderAgent, etc.)
- First-class TypeScript — type safety across the entire codebase

## Trade-offs Accepted

- Python has richer AI tooling if we ever need it (LangChain, CrewAI, etc.)
- `@xenova/transformers` is a port — sentence-transformers Python is the source of truth for embedding models
- Finding agent pattern examples online is slightly harder in TypeScript than Python
- FastAPI's async generator SSE streaming is more elegant than NestJS RxJS Observables

## Revisit Trigger

Consider a Python microservice (not full rewrite) if:
- A specific AI capability is only available in Python with no Node.js equivalent
- The embedding quality from @xenova/transformers becomes insufficient
- A LangChain/CrewAI feature becomes critical and cannot be replicated manually

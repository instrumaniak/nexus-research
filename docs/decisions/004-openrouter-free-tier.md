# ADR 004 — OpenRouter Free Tier for AI API

## Status: Accepted

## Date: 2026-03

## Context

Nexus requires LLM API access for summarization, orchestration, synthesis, and report writing. The constraint is zero additional paid services — the only paid resource is the existing web hosting.

## Decision

Use **OpenRouter** with free-tier models only.

## Reasons

- OpenRouter aggregates many models (Llama, DeepSeek, Gemma, Mistral) with a free tier
- A single API key and base URL works for all models — easy to swap models without code changes
- Free models are sufficient for the use cases: summarization, Q&A synthesis, report writing
- If a free model is removed, another can be substituted by changing the model ID string

## Free Models in Use (as of 2026-03)

| Task | Model |
|---|---|
| Orchestration | `deepseek/deepseek-r1:free` |
| Summarization | `meta-llama/llama-3.3-70b-instruct:free` |
| Synthesis / Q&A | `google/gemma-2-9b-it:free` |
| Report writing | `mistralai/mistral-7b-instruct:free` |

## Risk

Free tier models can be removed or rate-limited by OpenRouter without notice.
Mitigation: model IDs are config values (`.env` or constants file) — swap with one line change.

## Constraints

- Do not add any other paid AI API (OpenAI, Anthropic, Cohere, etc.)
- Ollama (local) is acceptable as a future fallback if OpenRouter free tier degrades
- If a paid model is ever introduced, it requires a new ADR and explicit approval

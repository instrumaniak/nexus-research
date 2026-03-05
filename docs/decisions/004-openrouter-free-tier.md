# ADR 004 — AI Provider (OpenRouter/Ollama/OpenAI-Compatible)

## Status: Accepted

## Date: 2026-03

## Context

Nexus requires LLM API access for summarization, orchestration, synthesis, and report writing. The constraint is zero additional paid services — the only paid resource is the existing web hosting.

## Decision

Use a **configurable AI Provider** with free-tier models. The default is OpenRouter, but Ollama (local) or any OpenAI-compatible endpoint is acceptable.

All LLM calls go through `AiProviderService` with model IDs sourced from `AI_MODELS` config (overridable via environment variables).

## Supported Providers

| Provider | Use Case | Configuration |
|---|---|---|
| **OpenRouter** (default) | Cloud-based free models | Set `AI_PROVIDER_BASE_URL=https://openrouter.ai/api/v1` |
| **Ollama** | Local/self-hosted models | Set `AI_PROVIDER_BASE_URL=http://localhost:11434/v1` |
| Any OpenAI-compatible | Custom endpoints | Set `AI_PROVIDER_BASE_URL` to your endpoint |

## Reasons

- A single API key and base URL works for all models — easy to swap models without code changes
- Free models are sufficient for the use cases: summarization, Q&A synthesis, report writing
- If a free model is removed, another can be substituted by changing the model ID string
- Ollama provides a fully local fallback for privacy or cost concerns

## Free Models in Use (as of 2026-03)

When using OpenRouter:

| Task | Model |
|---|---|
| Orchestration | `deepseek/deepseek-r1:free` |
| Summarization | `meta-llama/llama-3.3-70b-instruct:free` |
| Synthesis / Q&A | `google/gemma-2-9b-it:free` |
| Report writing | `mistralai/mistral-7b-instruct:free` |

## Environment Variables

| Variable | Description |
|---|---|
| `AI_PROVIDER_API_KEY` | API key for your chosen provider |
| `AI_PROVIDER_BASE_URL` | Base URL for the provider's API |
| `AI_MODEL_ORCHESTRATION` | Model for planning/decomposition (default: deepseek/deepseek-r1:free) |
| `AI_MODEL_SUMMARIZATION` | Model for summarization (default: meta-llama/llama-3.3-70b-instruct:free) |
| `AI_MODEL_QUICK_QA` | Model for quick Q&A (default: google/gemma-2-9b-it:free) |
| `AI_MODEL_REPORT` | Model for report writing (default: mistralai/mistral-7b-instruct:free) |

## Risk

Free tier models can be removed or rate-limited without notice.
Mitigation: model IDs are config values (`.env` or constants file) — swap with one line change.

## Constraints

- Do not add any other paid AI API (OpenAI, Anthropic, Cohere, etc.)
- If a paid model is ever introduced, it requires a new ADR and explicit approval

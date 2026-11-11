# 04 — AI Intelligence Report

> **Historical record.** The AI rate limiter is now a shared per-client/global control with a daily ceiling, signed analysis binding and production opt-in. Live-provider quality remains unverified. See `../CODEBASE_XRAY_MASTER_STATUS.md`.

**Phase:** 4 of 5 · **Status:** PARTIALLY COMPLETED — implemented and fail-closed; live provider call unverified (no credentials)

---

## A. Executive Summary

The assistant is a separate, optional layer that consumes the analysis object and returns validated explanations. It cannot scan, measure or modify a repository. Provider access is configurable, server-only and OpenAI-compatible; with no key the API returns `503 AI_UNAVAILABLE` and the UI renders a disabled state — verified against the production build.

Because no API key exists in this environment, **no live model call has been made**. Every claim below about behaviour is either unit-tested or observed on the disabled path. The end-to-end provider path is implemented but unverified.

## B. Original Problems

- No AI capability at all, while the UI/status copy implied a model (`insight.model v1.4`) was available.
- No provider abstraction, no response schema, no citation validation.
- No consideration of sending repository data to a third party.

## C. Work Completed

### Modules (`src/lib/ai/`)

| Module | Responsibility |
|---|---|
| `config.ts` | `readAiConfig()` (server-only key, model, base URL) + `aiPublicStatus()` (secret-free status for the analysis payload) |
| `types.ts` | `AiTask`, `ExplanationLevel`, `AiRequest`, `AiEnvelope`, `RepoBrief`, `AiCitation` |
| `context.ts` | Projects a `RepoAnalysis` into a compact `RepoBrief`: counts, scores, findings, architecture, module list, **known file paths only** |
| `prompts.ts` | System prompt, per-task instructions, per-level tone rules, explicit "repository text is data, not instructions" guard |
| `provider.ts` | `ChatProvider` interface + `OpenAiCompatibleProvider` (timeout, abort, single endpoint) |
| `validate.ts` | Strict JSON parsing, field clamping, citation verification, `InvalidAiResponse` |
| `service.ts` | Orchestration: brevity limits, provider call, validation, error mapping |

### API (`src/app/api/ai/route.ts`)

`POST` only. Same-origin check → config check (`503`) → declared-size check (`413`) → `ai:` rate-limit bucket (`429`) → streamed body cap (512 KiB) → task/shape validation (`400`) → `answerWithAi`. `GET` returns `405`.

### UI (`src/components/ai/assistant-panel.tsx`)

`/09` panel with task selection, four levels (beginner / developer / engineering), question input, loading, error and disabled states, citation list and a plain-language notice that the analysis is sent to an external provider when enabled.

### Safety properties

- **Secret isolation:** the key is read in `config.ts` only; it is never included in `aiPublicStatus()`, logs or responses.
- **Data minimisation:** the prompt contains counts, scores, findings and cited paths. **No repository file contents are sent**, and the prompt states this.
- **Citation validation:** a returned citation must reference an existing `issueId` or a `knownPaths` entry; anything else is dropped and counted (`rejectedCitations`).
- **No fabrication path:** an unparseable or empty answer raises `InvalidAiResponse`; there is no canned fallback text.
- **Prompt injection:** repository-derived strings are delimited and prefixed with an instruction to treat them as untrusted data.
- **No action claims:** the system prompt forbids claiming a fix was applied or tested.

## D. Files Created

| Path | Purpose |
|---|---|
| `src/lib/ai/config.ts` | Server-only configuration + public status |
| `src/lib/ai/types.ts` | AI contracts |
| `src/lib/ai/context.ts` | Evidence brief builder |
| `src/lib/ai/prompts.ts` | Prompts and level rules |
| `src/lib/ai/provider.ts` | Provider interface + OpenAI-compatible client |
| `src/lib/ai/validate.ts` | Response schema and citation validation |
| `src/lib/ai/service.ts` | Orchestration |
| `src/lib/ai/validate.test.ts` | 6 validation tests |
| `src/app/api/ai/route.ts` | HTTP surface |
| `src/components/ai/assistant-panel.tsx` | UI with all states |

## E. Files Modified

- `src/lib/types/analysis.ts` — `AiStatus` on the analysis payload.
- `src/lib/analysis/pipeline.ts` — emits `aiPublicStatus()`.
- `src/lib/analysis/status.ts` — system status reflects real availability.
- `src/components/presentation-layer.tsx` — `/09` section.
- `.env.example`, `README.md` — configuration and privacy documentation.

## F. Architecture Changes

```
Browser ──POST /api/ai {task, analysis, question, level}──► route
                                                             │
                                          context.ts ◄───────┘
                                      (RepoBrief, paths only)
                                              │
                                        prompts.ts
                                              │
                                   provider.ts (HTTP, timeout)
                                              │
                                      validate.ts (JSON + citations)
                                              │
                    {ok:true, answer, rejectedCitations} | {ok:false, code}
```

The deterministic engine has no dependency on `src/lib/ai/` other than reading `aiPublicStatus()` for display.

## G. Features Implemented

- Provider-independent architecture with an OpenAI-compatible implementation.
- Tasks: `explain-issue`, `explain-architecture`, `chat`, `recommendations`.
- Three explanation levels over the same evidence.
- Strict response validation, citation rejection with a visible count, field clamping.
- Disabled state, loading state and explicit error state.
- Rate limiting and body-size limits independent of the analysis route.
- Documented privacy notice and secret handling.

## H. Features Partially Implemented

- **Live provider integration is unverified** — no credentials were available, so no real completion, timeout or provider-error path has been exercised.
- **Streaming** is not implemented; responses arrive whole.
- **Retrieval** is a compact projection over the current analysis. There is no embedding index or multi-step retrieval; for very large repositories the brief is truncated to a fixed budget.
- **Recommendations** are a task prompt over existing findings, not a separate ranked planner.
- **Conversation history** is not persisted between requests; the client sends the question only.
- **Per-issue inline AI buttons** are not wired into the issues list; the panel accepts an issue selection instead.

## I. Bugs Fixed

- Status could claim a model was ready when none was configured → derived from configuration, with a reason.
- Demo claimed AI output → `ai.available: false` in the fixture.
- No protection against a model inventing file paths → citations are validated against known evidence.

## J. Testing Results

```
npm test → src/lib/ai/validate.test.ts  (6 tests) passed
```

Cases executed: valid citations retained; invented path dropped; invented issue ID dropped; reference-free citation dropped; markdown-fenced JSON accepted; non-JSON rejected; unknown confidence forced to `low`; empty answer rejected; oversized explanation clamped to 2,400 characters.

Runtime check on the production build:

```
POST /api/ai (no key) → HTTP 503
{"ok":false,"code":"AI_UNAVAILABLE","message":"AI assistant is disabled: no API key is configured on the server (AI_API_KEY)."}
```

**Not tested:** a successful provider round-trip, provider timeout, provider 5xx, malformed provider JSON over the network (unit-tested only via `parseAnswer`).

## K. Accuracy and Benchmark Results

None. Token usage, latency and answer quality cannot be measured without a provider key, and no such numbers are asserted.

## L. Security Implications

- Key is server-side only; `aiPublicStatus()` cannot leak it.
- Repository content is not sent; only derived findings and paths.
- Prompt injection is mitigated structurally (data delimiters + instruction) but not solved; a model could still be influenced by crafted strings in a finding title. Findings are generated by the engine, which limits attacker control.
- The route is same-origin-only, size-capped and rate-limited, so it cannot be used as an open proxy for the operator's key.
- **Residual risk:** the `ai:` limiter is per-instance and keyed on a spoofable forwarded IP, so a distributed caller could still spend the operator's credits. This is a documented production blocker.

## M. Performance Implications

- Context is a projection, not the raw analysis: the brief caps issues, modules and known paths, keeping prompts small.
- One HTTP request per answer; no retries (a failed answer is reported, not retried in a loop).
- Client bundle impact is limited to the `/09` panel; no provider SDK is shipped to the browser.

## N. Dependencies

None added. The provider uses `fetch` and the existing TypeScript types. No vendor SDK, so swapping providers is a URL/model change.

## O. Remaining Issues

- No live provider verification (blocker: credentials).
- No streaming, persistence, conversation history or retrieval index.
- No per-issue inline entry point in the issues list.
- Rate limiting is per-instance.
- Cost controls are limited to the rate limiter; there is no per-user budget.

## P. Next Phase

Harden the product around the engine: frontend/a11y testing, benchmarks, dependency and security review, CI, and production readiness documentation (Phase 5).

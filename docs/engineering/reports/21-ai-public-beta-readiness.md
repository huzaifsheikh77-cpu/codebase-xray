# 21 — AI Public-Beta Readiness

**Status:** B1 TRUST BOUNDARY IMPLEMENTED LOCALLY · live-provider verification still POSTPONED

## Current behaviour

- No `AI_API_KEY` → `/api/ai` returns 503 `AI_UNAVAILABLE` with a server-derived reason; the panel renders a disabled state; deterministic analysis is unaffected.
- `AI_DISABLED=1` forces the disabled state even with a key.
- No provider call is made before config, origin, body-size and quota checks pass.

## Protections added

| Control | Value |
|---|---|
| Own quota bucket | 4/client, 20 global per minute (shared store) |
| Body cap | 512 KiB |
| Question cap | 4,000 chars |
| Task allowlist | 4 known tasks |
| Analysis shape validation | full `validateAnalysisForAi` nested schema; malformed payloads → 400 |
| Analysis integrity | HMAC `aiToken`, 15-minute expiry, exact-payload binding |
| Production access | opt-in `AI_PUBLIC_ENABLED=1`; `AI_DISABLED=1` still forces off |
| Daily ceiling | `AI_DAILY_REQUESTS` (default 200) via shared store |
| Context cap | 24k chars / 12 issues / 400 paths |
| Responses | `Cache-Control: no-store` |
| Secrets | server-only; never in bundle, logs, errors, or context |
| Grounding | `evidence`/`inferred`/`general`; `source` rejected |

## Explicitly postponed (not verified, not claimed)

Real-provider success, 401, timeout, 5xx, rate limit, malformed JSON, citation accuracy, prompt-injection resistance against a live model, hallucination rate, recommendation quality, token cost. The matrix is in `docs/engineering/ai-evaluation.md`.

## Residual risk

If a key is added without running the matrix, the assistant may produce unverified advice. It still cannot invent citations (validator drops them) or measurements (no measurement tools), but recommendation quality is untested. A modified client payload now fails the signed binding; this is tamper resistance, not proof that the model resists every prompt injection.

## Next

Post-deployment milestone: run the evaluation matrix, then enable for a small cohort only after citation and injection cases pass.

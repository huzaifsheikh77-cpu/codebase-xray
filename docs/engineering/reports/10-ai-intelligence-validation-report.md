# 10 — AI Intelligence Validation

**Status:** IMPLEMENTED, PARTIALLY VERIFIED — validation and failure paths tested with an injected provider; **no live provider call** (no credentials)

---

## Pipeline audit

```
POST /api/ai
  → isCrossOrigin (403)
  → readAiConfig (503 when unconfigured)
  → declared Content-Length check (413)
  → ai: rate-limit bucket (429)
  → streamed body cap 512 KiB
  → task / analysis / question validation (400)
  → buildRepoBrief(analysis)          ← projection only
  → buildUserPrompt                   ← brief + level + task
  → provider.complete (timeout, abort)
  → parseAnswer(raw, brief)           ← strict JSON + citation validation
  → { ok, answer, meta }
```

**Critical fact:** the assistant has **no source-code access**. The brief contains counts, scores, findings, module names and citable paths — not file contents. It therefore cannot explain a function's internals, and the system prompt now states this explicitly (rule 10).

## What changed in this milestone

1. **Grounding field.** `AiAnswer.grounding` is one of `evidence | inferred | general`. A model claiming `source` is coerced to `inferred`; the validator never accepts source-level grounding.
2. **`requiresMoreInspection`.** Answers must list evidence that would be needed (e.g. an uninspected auth module). Rendered in the panel.
3. **Provider injection.** `answerWithAi(request, deps)` accepts a config + provider. Production still resolves both itself; tests use a controlled provider with **no network**.
4. **Brief bug fix.** `sourceFiles` was being populated from `exactLocFiles`; corrected, so the model is told the real source-file count.
5. **Explicit coverage in the prompt.** `COVERAGE` and every warning are included, so partial scans cannot be described as complete.

## Executed tests (`service.test.ts`, 6 validation tests, 5 service tests)

| Scenario | Result |
|---|---|
| Valid JSON from injected provider → validated answer + metadata | pass |
| Non-JSON prose → `AI_INVALID_RESPONSE`, no fallback text | pass |
| Provider throws → `AI_PROVIDER_ERROR`, no throw escapes | pass |
| Unavailable config even with a provider present → `AI_UNAVAILABLE` | pass |
| Unknown `issueId` → answered with "not present" instruction | pass |
| Citation to invented path / unknown ID / reference-free → dropped & counted | `validate.test.ts` |
| Unknown confidence → `low`; oversized fields clamped | `validate.test.ts` |
| Empty answer → rejected | `validate.test.ts` |
| Runtime disabled path | `503 AI_UNAVAILABLE` (verified on the production build) |

## Not verified (blocked)

- **Real provider success, timeout, 401, 5xx, rate-limit, malformed upstream JSON.** No `AI_API_KEY` exists in this environment; using a mock and calling it live integration would violate the brief.
- **Prompt-injection resistance against a real model.** The prompt treats brief text as untrusted data and the brief excludes repository instructions, but no adversarial model run occurred.
- **Token usage / latency / cost.** Not measurable without a provider.

## Evaluation dataset

`docs/engineering/ai-evaluation.md` defines 18 scenarios across architecture, code understanding, security, recommendations, beginner explanations and adversarial/uncertainty prompts. Status recorded there: **contract-tested** where validation can be asserted without a model (citations, empty answers, unknown findings); **unexecuted** where a real model is required. No scores are invented.

## Safety properties (verified by code/tests)

- Key read only in `config.ts`; `aiPublicStatus()` is secret-free.
- No repository contents in the brief; no GitHub token; no client IP.
- Same-origin, size-capped, separately rate-limited route.
- Strict schema, citation rejection, no canned fallback.
- The panel states "ONLY THE ANALYSIS SUMMARY IS SENT" and that the key is server-only.

## Recommendation quality

Recommendations are task-prompt output over existing findings, not a separate planner. The prompt requires: issue, why it matters, affected finding IDs, a concrete next step, and honesty about verification. Generic advice is discouraged but **not mechanically prevented** — a model can still produce it. This is a known limitation until a live evaluation rubric is run.

## Limitations

- No streaming, history, retrieval index, or per-user budget.
- Rate limiting is per-instance and keyed on a spoofable forwarded IP (see Report 12).
- The brief truncates issues to 12 and paths to 400; a very large analysis is answered from a subset, which the model is told.

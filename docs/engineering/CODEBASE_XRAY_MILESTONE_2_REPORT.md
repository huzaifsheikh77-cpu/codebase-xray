# CODEBASE XRAY — MILESTONE 2 REPORT

> **Historical record (2026-11-04).** The per-instance limiter described below was replaced by the shared atomic quota in B1. Current status is in `CODEBASE_XRAY_MASTER_STATUS.md`.
## Intelligence Validation & Reliability

**Engine:** `xray.engine v3.0.0` · **Scoring:** `xray.score v3.0.0` · **Next.js:** 15.5.29
**Date:** 2026-11-04 · **Working tree:** modified, not committed

---

## A. Executive summary

Milestone 2 converted unverified claims into checks. The engine now has an accuracy benchmark with labelled fixtures, an explicit critical-path coverage model, a language capability matrix that cannot overclaim, a fail-closed AI grounding contract, component tests, and a CI gate that includes the benchmark.

The benchmark immediately found a real defect that unit tests had missed: monorepos with workspace packages silently dropped top-level module nodes, so `tsconfig` alias edges vanished. That is fixed with a regression test. A second defect — the AI brief reporting the wrong source-file count — was found by the same re-audit and fixed.

**Verdict: internal testing ready. Not public-beta ready** (shared quota, licence and unverified AI provider remain).

## B. Previous milestone verification

| Claim | Result |
|---|---|
| Adaptive budgets, TS AST, Python structural, root graph node, aliases, evidence, coverage, scoring v3, AI citation validation, demo honesty | CONFIRMED by code + tests |
| “No security headers” | **DISPROVED** — headers were present and are verified live |
| “AI provider path unverified” | CONFIRMED — still no key |
| “No frontend tests” | CONFIRMED at baseline; now 8 tests exist |
| “14-section report” | CONFIRMED as 10 panels; dimensions accounted for, not all rendered |
| CI workflow | Present; **not executed on GitHub** |

## C. Architecture

```mermaid
flowchart LR
  A[GitHub tree] --> B[prune] --> C[planBudget] --> D[prioritize<br/>critical-first] --> E[bounded fetch]
  E --> F[parsers<br/>TS AST / Python / generic]
  F --> G[quality] & H[graph]
  E --> I[security rules]
  E --> J[extractors]
  G --> K[detectors]
  H --> K
  I --> K
  J --> K
  K --> L[sector scoring v3]
  L --> M[RepoAnalysis<br/>coverage · budget · critical · capabilities]
  M --> N[UI /00–/09]
  M --> O[/api/ai → brief → provider → validate]
```

New modules: `analysis/critical.ts`, `analysis/capabilities.ts`, `benchmarks/{cases,runner}`, `vitest.benchmark.config.ts`, three component tests.

## D. Analysis accuracy

Controlled corpus, 7 fixtures, executed via `npm run benchmark`:

| Metric | Value |
|---|---|
| Labelled findings (TP) | 10 |
| False positives | 0 |
| Missed (FN) | 0 |
| Precision / Recall / F1 | 100% / 100% / 100% (labelled fixtures only) |
| Critical-path selection recall | 2/2 |
| Structural assertions | 14/14 |
| Corpus coverage | every fixture inspected 100% of eligible files |

Defect found and fixed: monorepo alias edge (1 edge → 2). Artifacts: `docs/engineering/benchmarks/latest.{json,md}`.

## E. Language capabilities

TypeScript/JavaScript **full** (compiler API). Python **partial** (structural, not AST). Go, Rust, Java, Kotlin, C#, Ruby, PHP, C/C++, Swift **import-only**. Everything else unsupported and counted. Tests enforce that `full` implies an AST parser and that import-only never claims functions or complexity.

## F. Adaptive scanning

- Tiered budgets (48/72/96/128 files; 160 ceiling; 6–12 MiB; 8 concurrency; 35 s default).
- Critical paths (auth/api/data/security-config/entry) rank ahead of generic source.
- /08 discloses inspected vs eligible, skipped-by-budget, unsupported source, parser depth and per-category critical coverage.
- Warnings fire for partially inspected auth/api/data/security-config.
- Real-repository recall could not be re-measured: unauthenticated quota exhausted (reset 01:14 UTC).

## G. AI intelligence

- No source access: the model receives a projection (counts, scores, findings, paths), never file contents.
- New `grounding` (`evidence|inferred|general`) and `requiresMoreInspection`; `source` grounding is rejected.
- Unknown citations dropped and counted; empty/invalid answers rejected.
- Provider injection added for tests; 5 service tests + 6 validation tests pass.
- Live provider: **BLOCKED** (no key). Evaluation matrix in `docs/engineering/ai-evaluation.md`.

## H. Frontend reliability

8 component tests (issues empty/detail, coverage disclosure/critical gaps/no-coverage, AI disabled/available). No browser automation: documented gap, not claimed coverage. Production build served 200 and demo scan returned 200.

## I. Security

Headers verified live (CSP, XFO, nosniff, referrer, permissions). Same-origin, body caps, rate limit, secret isolation and redaction verified by tests. **Rate limiter is per-instance and keyed on a spoofable header** — demonstrated by rotating the forwarded key. Shared-quota design specified, not implemented. Audit: 2 advisories (1 high `postcss` nested in Next, 1 moderate). No licence.

## J. Performance

Fixtures: 50 files, 50 requests, < 100 ms total. Budgets bound production scans at 160 files / 12 MiB / 8 concurrency. Build ~8 s; bundle unchanged (121 kB / 224 kB). Memory, real-repo latency and load behaviour are **not measured**.

## K. Report completeness

All 14 dimensions are accounted for; 10 panels render them. Performance indicators are **missing** (no reliable static measurement); technical debt and dependency health are partial. No placeholder panels were added.

## L. Testing — exact results

```
npm run typecheck → 0
npm run lint      → 0
npm test          → 19 files / 110 tests passed
npm run benchmark → 7 fixtures · 1 test passed · TP 10 FP 0 FN 0
npm run build     → exit 0
npm audit --omit=dev → 2 vulnerabilities (1 high, 1 moderate)
```

## M. Production readiness

| Capability | Classification |
|---|---|
| Deterministic engine | **VERIFIED** |
| Benchmark (fixtures) | **VERIFIED** |
| Language depth claims | **VERIFIED** (as labelled) |
| Critical-path coverage | **PARTIALLY VERIFIED** (fixtures only this milestone) |
| AI contract/validation | **VERIFIED**; live provider **BLOCKED** |
| Frontend components | **PARTIALLY VERIFIED** |
| Security headers/limits | **VERIFIED** |
| Shared quota | **NOT IMPLEMENTED** |
| CI | **IMPLEMENTED, NOT VERIFIED** (no GitHub run) |
| Licence | **NOT IMPLEMENTED** (owner decision) |

## N. Known limitations

Sampling is prioritised, not representative. Dependencies are manifest-level. Python is not an AST; nine languages are import-only. Complexity and duplication are proxies. Graph is capped at 32 nodes / 60 edges. No CVE feed, execution, coverage ingestion, persistence or history. No accuracy claim on arbitrary repositories.

## O. Remaining risks (ranked)

1. **Quota**: unauthenticated 60/h makes a medium scan impossible; no shared limiter.
2. **Licence**: no legal reuse grant.
3. **AI provider**: success/timeout/5xx/injection paths unverified.
4. **`postcss` high advisory** via Next.
5. **Frontend**: no browser-level regression protection.
6. **Accuracy corpus**: fixtures only; no pinned real-repository set.

## P. Next recommended milestone

**“Verified public beta”**: implement shared quota + token requirement + repository cache; choose a licence; run the AI evaluation matrix against a real provider; add Playwright journeys; build a pinned public-repository corpus (commit SHAs) and report precision/recall with confidence intervals.

# 06 — Current State Verification

**Milestone:** 2 · **Date:** 2026-11-04 · **Method:** independent re-inspection of code, then execution.

---

## Status

| Area | Classification |
|---|---|
| Architecture reconstruction | VERIFIED |
| Previous milestone claims | 14 confirmed · 2 disproved · 2 partially confirmed |
| Baseline checks (pre-change) | typecheck 0 · lint 0 · 87 tests / 13 files |
| Final checks (post-change) | typecheck 0 · lint 0 · **110 tests / 19 files** · build 0 · benchmark 0 |

## A. Actual architecture (reconstructed from code, not reports)

```mermaid
flowchart TD
  U[URL input] --> V[parseRepoUrl]
  V --> R[POST /api/analyze]
  R --> G[request guards: origin, body cap, rate limit]
  G --> H[GitHubClient: repo + tree + N blobs]
  H --> P[pruneEntries]
  P --> B[planBudget]
  B --> PR[prioritize + critical ranking]
  PR --> F[bounded fetch 8-way]
  F --> PS[parseFiles: TS AST / Python / generic]
  PS --> Q[quality]
  PS --> G2[buildGraph]
  F --> SR[security rules]
  P --> X[extractors: stats, deps, testing, docs, security, arch]
  Q --> D[detectIssues]
  G2 --> D
  SR --> D
  X --> D
  D --> S[sector scoring v3]
  S --> A[RepoAnalysis + coverage/budget/AI status]
  A --> UI[/00–/09 panels]
  UI --> AI[POST /api/ai → brief → provider → validate]
```

Entry points: `src/app/page.tsx` → `xray-experience.tsx`; `src/app/api/analyze/route.ts`; `src/app/api/ai/route.ts`.
Orchestration: `src/lib/analysis/pipeline.ts` (pure, injected client). Parsers: `src/lib/analysis/parsers/`. Scoring: `src/lib/analysis/scoring/`. AI: `src/lib/ai/`.

## B. Claim verification

| Previous claim | Actual implementation | Verification method | Result |
|---|---|---|---|
| Adaptive 48/72/96/128 file budgets | `planBudget` tiers + ceilings (160 files, 12 MiB, 10 concurrency, 40 s) | `budgets.test.ts` (3), code read | CONFIRMED |
| TypeScript compiler API (AST) | `ts.createSourceFile`, imports/exports/functions/classes/complexity | `registry.test.ts`, code read | CONFIRMED |
| Python structural (not AST) | indentation scan, `ast: false` | `registry.test.ts`, `capabilities.test.ts` | CONFIRMED |
| Other languages import-only | generic scanner, 9 languages | capability matrix + tests | CONFIRMED |
| Root-level graph node | `__root__` node | `graph.test.ts`; prior live p-map 5 edges | CONFIRMED |
| tsconfig aliases | `parseTsPaths` + `resolveAlias` | `graph.test.ts` (with/without alias) | CONFIRMED — but **workspace packages suppressed top-level module nodes**, so aliases between `src/` and `shared/` were lost in monorepos (found by benchmark, fixed) |
| Dependency extraction | root manifests only; no lockfile graph | code read | PARTIALLY CONFIRMED (documented limit) |
| Quality metrics | spans, params, complexity proxy, duplicates | `quality.test.ts` (4) | CONFIRMED |
| Security classification | patterns + redaction + verification text | `security.test.ts`, code read | CONFIRMED |
| Evidence references | id/category/confidence/method/limitation/file/line | contract + detectors | CONFIRMED |
| Coverage calculation | eligible vs inspected files/bytes + parsed/failures | pipeline + live probes | CONFIRMED (see limitation below) |
| `scoringVersion` + empty sectors neutral | `xray.score v3.0.0`, neutral 50 | code read, `sectors.test.ts` | CONFIRMED |
| AI citation validation | unknown paths/IDs dropped + counted | `validate.test.ts` (6) | CONFIRMED |
| AI explanation levels | beginner/developer/engineering | prompts + UI | CONFIRMED |
| AI rate limiting | `ai:` bucket | code read; 503 path probed | CONFIRMED but per-instance |
| Demo honesty | fixture claims only implemented detectors | fixture read; API probe | CONFIRMED |
| GitHub quota handling | 401/403/429 mapping + partial disclosure | route + prior live express scan | CONFIRMED |
| CI workflow | `.github/workflows/ci.yml` | file read | CONFIRMED — **never executed on GitHub** |
| Security headers exist | `next.config.ts` already had CSP/XFO/nosniff/referrer/permissions | file read + live `curl -D` | **DISPROVED previous claim** ("no headers") |
| No frontend tests | none existed | test inventory | CONFIRMED (now 3 files / 8 tests) |
| AI provider verified live | never called | no key present | CONFIRMED as BLOCKED |

## C. Discrepancies found and their disposition

1. **Graph node suppression (fixed).** `buildGraph` only created top-level module nodes when there were *no* workspace packages. A monorepo therefore had package nodes but no `src`/`shared` nodes, so an alias edge had nowhere to attach. Detected by the new benchmark (`monorepo-alias` 1 edge, expected 2). Fixed; regression test added.
2. **Misreported source count (fixed).** `ai/context.ts` sent `stats.exactLocFiles` as `sourceFiles`, overstating the analysed corpus. `RepoStats.sourceFiles` added and populated; brief now uses it.
3. **Security headers claim (corrected).** Headers were already present and were verified live:
   `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `CSP: frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
4. **Coverage semantics.** `inspectedPct` is inspected ÷ *eligible* (post-prune) files, not ÷ all tree files. Total tree size remains in `stats.totalFiles`. This is now stated in the UI and benchmark report; it is a definition, not a defect.

## D. What was added in this milestone

- Critical-path classification and coverage (`src/lib/analysis/critical.ts`), with warnings for partly inspected auth/api/data/security-config areas.
- Language capability registry (`src/lib/analysis/capabilities.ts`) with tests that forbid overclaiming.
- Coverage fields: `skippedForBudget`, `unsupportedSourceFiles`, `critical[]`, `capabilities`.
- Risk-aware prioritisation (critical paths first within the source tier).
- Accuracy benchmark corpus + runner + generated artifacts + CI step.
- AI grounding/uncertainty fields and injectable provider tests.
- Frontend component tests (jsdom + Testing Library + plugin-react).

## J. Executed verification

```
npm run typecheck → 0
npm run lint      → 0
npm test          → 19 files / 110 tests passed
npm run benchmark → 7 fixtures · TP 10 · FP 0 · FN 0 · structural 14/14
npm run build     → success (Next 15.5.29)
live: GET / 200 · headers present · demo 200 · /api/ai 503
live analysis: BLOCKED by GitHub unauthenticated quota (reset 01:14 UTC)
```

## O. Remaining unknowns

- Behaviour against a real AI provider (no credentials).
- Accuracy on arbitrary public repositories (no labelled corpus beyond fixtures).
- Memory usage and scan latency distribution (not instrumented).
- CI execution in GitHub Actions.

## P. Next

Benchmark-informed hardening: language depth for Java/Go, shared quota, and a verified AI provider path (see Report 15).

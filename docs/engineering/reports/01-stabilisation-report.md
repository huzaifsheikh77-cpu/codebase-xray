# 01 — Stabilisation Report

**Phase:** 1 of 5 · **Status:** COMPLETED · **Engine:** `xray.engine v3.0.0`

---

## A. Executive Summary

Phase 1 removed the correctness defects that made the previous build untrustworthy: a crash on zero-issue repositories, an import graph that reported no relationships for root-level entry files, unresolved TypeScript path aliases, scoring that rewarded missing evidence in two of six sectors, a demo that advertised detectors the engine did not have, fabricated scan telemetry, and an artificial 6.2-second delay before results could appear.

Every fix is covered by a regression test or a live probe. The complete suite (13 files, 87 tests), typecheck, lint and production build pass after the changes.

## B. Original Problems

| # | Problem | Verified before the work |
|---|---|---|
| 1 | `IssuesSection` crashed with zero issues | Indexed `issues[0]` for initial selection |
| 2 | Root-level entry files never produced graph edges | Nodes came only from top-level directories; `sindresorhus/p-map` returned 6 nodes / **0 edges** |
| 3 | `tsconfig` path aliases unresolved | `@/*` imports were treated as external or dropped |
| 4 | Client and server URL validation differed | The form used a separate regex from `parseRepoUrl` |
| 5 | Scoring damping applied to 4 of 6 sectors | Security and documentation could score 100 on a one-file repo |
| 6 | Analysis status could claim an AI model was ready | Status text was hardcoded rather than derived from configuration |
| 7 | Demo claimed unimplemented capabilities | Cycle detection, churn, branch coverage, CVE advisories, doc drift, semantic duplication |
| 8 | Simulated scan telemetry | Invented clone speed, AST progress, quota figures and completion stages |
| 9 | Artificial 6.2 s minimum scan duration | Results were withheld after the response arrived |
| 10 | Zero-issue / empty states missing | Sections assumed non-empty arrays |
| 11 | Dead code and duplicated components | `score-pill.tsx`, duplicate `ErrorState` |
| 12 | Unused API error state | `REPO_TOO_LARGE` was in the contract but never emitted |

## C. Work Completed

- **Zero-issue safety.** `IssuesSection` now holds a nullable selection, renders `EmptyState` when no findings exist, and keeps filters (severity, category) usable when the list is empty. No detector is forced to emit a placeholder finding.
- **Graph root module.** Added a synthetic `__root__` node for root-level source files. Imports from `index.js` now become real edges instead of disappearing.
- **Alias resolution.** `parseTsPaths` reads `compilerOptions.baseUrl` and `paths` from `tsconfig.json`/`jsconfig.json`, strips comments/trailing commas, and resolves matched aliases through `resolveFile`. `baseUrl: "."` normalises to the repository root (a defect found by the new tests, where the first implementation produced `././shared/util`).
- **Unresolved imports.** Specifiers that look internal but map to no file increment `graph.unresolvedImports`. Third-party packages are not counted as unresolved internals.
- **Shared validation.** The repository form imports `parseRepoUrl` from `src/lib/github/parse-url.ts`; there is no second URL grammar.
- **Uniform damping + confidence.** All six sectors pass through `damp()`; each sector carries a `Confidence` label.
- **Honest status.** `aiPublicStatus()` derives the AI block from `AI_API_KEY`/`OPENAI_API_KEY`; with no key the response says unavailable and why.
- **Honest demo.** The fixture claims only detectors that exist. `isDemoData` is true, `ai.available` is false, and the demo's coverage/budget values are labelled as fictional in the fixture header.
- **No artificial delay.** `DEMO_SCAN_MS = 2400` is a *simulated readout* for the offline demo only; live results are applied when the response arrives. A stale-response token prevents an older scan from overwriting a newer one.
- **Illustrative progress.** The overlay states that the progress animation is illustrative; no fake clone speed, quota or AST counters remain.
- **Dead code removed.** `src/components/ui/score-pill.tsx` deleted (no importers); the duplicate `ErrorState` export removed from `empty-state.tsx`.
- **Contract cleanup.** `REPO_TOO_LARGE` removed from `AnalysisErrorCode` and the route's status map, because nothing emitted it.
- **Shared request guards.** `src/lib/server/request-guards.ts` centralises same-origin checks and streaming body-size caps, used by both `/api/analyze` and `/api/ai`.

## D. Files Created

| Path | Purpose |
|---|---|
| `src/lib/server/request-guards.ts` | `isCrossOrigin`, `readJsonBody` (chunked, Content-Length-independent cap) |
| `src/lib/analysis/budgets.test.ts` | Adaptive budget + ceiling clamp tests |
| `src/lib/analysis/graph.test.ts` | Root node, alias, unresolved-import, workspace and type-only tests |
| `src/lib/analysis/parsers/registry.test.ts` | Parser routing and AST/heuristic honesty tests |
| `src/lib/analysis/quality.test.ts` | Measured quality metric tests |
| `src/lib/ai/validate.test.ts` | Citation rejection and clamping tests |

## E. Files Modified

| Path | Change |
|---|---|
| `src/components/issues/issues-section.tsx` | Nullable selection, filters, empty state, confidence/limitation display |
| `src/components/xray-experience.tsx` | Removed result gate, added stale-token guard, honest demo timing |
| `src/components/hero/repo-form.tsx` | Uses the shared server URL parser |
| `src/components/hero/scan-overlay.tsx` | Illustrative-progress caption; no invented telemetry |
| `src/components/ui/empty-state.tsx` | Removed duplicate `ErrorState` |
| `src/components/presentation-layer.tsx` | Added `/08` coverage and `/09` assistant sections |
| `src/lib/analysis/graph.ts` | Root node, aliases, unresolved counting |
| `src/lib/analysis/scoring/sectors.ts` | Uniform damping + confidence on all sectors |
| `src/lib/analysis/status.ts` | Status derived from real configuration |
| `src/lib/analysis/limits.ts` | Legacy caps retained where still used; budget module is authoritative |
| `src/lib/types/analysis.ts` | New optional contract fields; removed unused error code |
| `src/lib/mock/repo-analysis.ts` | Rewritten to claim only implemented detectors |
| `src/lib/mock/scan-stages.ts` | Stages relabelled as illustrative |
| `src/app/api/analyze/route.ts` | Shared guards, budget overrides |

## F. Architecture Changes

Request validation moved out of individual routes into `src/lib/server/request-guards.ts`. Analysis limits moved from a single constant table (`limits.ts`) to an adaptive budget object produced by `planBudget()`, which is emitted in the response so the UI can explain it. The graph gained an explicit root node and an explicit unresolved-import counter, replacing the previous silent "0 edges" outcome.

## G. Features Implemented

- Zero-issue reports render with a meaningful empty state.
- Root-level repositories produce edges (verified: `sindresorhus/p-map` → `__root__` plus 5 external edges).
- `tsconfig` aliases resolve (unit-tested both with and without the alias).
- Unresolved internal imports are counted and surfaced.
- A single URL grammar on client and server.
- An explicitly disabled AI state with a human-readable reason.
- Partial-analysis disclosure for sampling, fetch-budget exhaustion and mid-scan rate limits.

## H. Features Partially Implemented

- **Empty states** exist for issues, coverage and assistant; the graph and dependency panels still rely on their previous handling.
- **Accessibility** improvements are limited to semantic headings, `aria-hidden` on decorative icons and labelled controls. No audit with a screen reader was performed.

## I. Bugs Fixed

1. **Zero-issue crash** — `issues[0]` was assumed to exist. Root cause: non-null assumption on a variably-sized array. Fix: nullable selection + empty state.
2. **Root-file graph loss** — node derivation ignored files without a directory. Root cause: directory-only node model. Fix: `__root__` node.
3. **Alias resolution** — no `paths` parsing; and the first fix mishandled `baseUrl: "."`. Root cause: un-normalised base path. Fix: explicit normalisation + test.
4. **Damping asymmetry** — security/documentation skipped damping. Root cause: divergent sector implementations. Fix: all sectors call `damp()`.
5. **Fabricated capabilities** — the fixture described features that did not exist. Root cause: marketing copy treated as data. Fix: fixture rewritten against the detector list.
6. **Fake telemetry** — progress claimed measurements that were never taken. Root cause: animation reused as instrumentation. Fix: labelled illustrative; synthetic quota removed.
7. **Artificial delay** — a 6.2 s floor. Root cause: demo pacing applied to live results. Fix: removed.
8. **Unused error code** — contract drift. Fix: removed end to end.

## J. Testing Results

Executed on Windows, Node v24.21.0, npm 11.19.0, after all Phase 1 changes and the Next.js upgrade:

```
npm run typecheck   → exit 0
npm run lint        → exit 0
npm test            → 13 files, 87 tests passed (exit 0)
npm run build       → exit 0 (Next.js 15.5.29)
```

Live probes against the production build (port 3322/3333):

| Target | Result |
|---|---|
| Demo `nebula-labs/orbit-forge` | `isDemoData: true`, 11 nodes, 13 edges, 6 issues, score 68, AI unavailable |
| `sindresorhus/p-map` | 14/14 eligible files inspected, 7 parsed, `__root__` + 8 external nodes, **5 edges**, 0 unresolved, 10 issues, score 55 |
| `octocat/Hello-World` | 1/1 file, 100%, 0 nodes (no source directories), 2 issues, score 53 |
| `POST /api/ai` without a key | `503` `AI_UNAVAILABLE` with the configured reason |

## K. Accuracy and Benchmark Results

No accuracy percentage is claimed. Phase 1 established regression evidence only: the p-map scan that previously produced **0 edges** now produces 5 edges rooted at `__root__`, and the express scan (Phase 5) shows the sampler and unresolved counter working together rather than silently reporting completeness.

## L. Security Implications

- Request-body limits are now enforced while streaming, so a lying `Content-Length` cannot bypass the cap.
- Same-origin enforcement is shared by both POST routes.
- No new secrets are stored or returned. The AI key stays server-side (Phase 4).
- No change to the fact that the rate limiter is per-instance and keyed on a spoofable header — documented as an outstanding production blocker.

## M. Performance Implications

- The artificial 6.2 s delay is gone; live results appear as soon as the response is available.
- Graph alias parsing adds one JSON parse of the fetched `tsconfig`.
- The bundle grew from 117 kB to 121 kB for `/` (First Load JS 224 kB) due to new UI sections; the TypeScript compiler is server-only and external to the client bundle.

## N. Dependencies

- `typescript` moved to runtime `dependencies` (needed by the server parser), and `serverExternalPackages: ["typescript"]` added so Next does not bundle the compiler.
- `next` upgraded `15.5.27 → 15.5.29` (Phase 5, patch-level security fix).
- No packages removed.

## O. Remaining Issues

- Frontend component tests are not yet present (no `jsdom`/Testing Library installed; install requires network approval).
- Graph, dependency and structure panels have no dedicated empty-state component.
- No accessibility audit beyond markup review.

## P. Next Phase

Replace the regex-only extractors with the language-aware parser registry and adaptive inspection budgets (Phase 2), then make the evidence model explicit in the contract (Phase 3).

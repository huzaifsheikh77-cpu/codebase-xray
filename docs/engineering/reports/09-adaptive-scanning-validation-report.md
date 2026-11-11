# 09 — Adaptive Scanning Validation

**Status:** PARTIALLY VERIFIED — selection logic and critical-path disclosure implemented and fixture-tested; real-repository recall blocked by GitHub quota

---

## Selection pipeline (as implemented)

```
tree → prune(ignored, binary, >256 KiB) → planBudget(eligible)
     → prioritize:
         0 root README
         1 root/workspace manifests
         2 package manifests (cap 4)
         3 entry points + root config (cap 4)
         4 source  ← critical paths first (auth/api/data/security-config/entry)
         5 tests/fixtures (cap sampleTestFiles)
         6 docs (cap 2)
         7 other
         8 vendored/generated/minified (cap 2, last resort)
     → slice(0, budget.maxFiles) → bounded fetch (8 concurrent, byte + deadline caps)
```

Critical ranking is applied *within* the source tier, so security code cannot be displaced by generic source of the same size class. Ties break on bytes then path, preserving determinism (covered by `tree-utils.test.ts`).

## Critical-path classification

`src/lib/analysis/critical.ts` classifies **paths** into `entry`, `api`, `auth`, `data`, `security-config`, `test`, with a stated reason.

- It is explicitly path-based. The UI says: “CLASSIFIED BY PATH, NOT CONTENT. A MISSING CATEGORY DOES NOT PROVE THE CODE IS ABSENT.”
- `criticalCoverage(allPaths, inspectedSet)` reports discovered vs inspected per category, omitting categories with zero discovered files.
- `criticalCoverageWarnings` emits `CRITICAL PATH NOT FULLY INSPECTED — AUTH: 0 OF 2 FILES READ` for auth/api/data/security-config only.
- The pipeline marks the scan `partial` when a non-test critical category is incomplete.

## Measured recall

| Target | Ground truth | Result |
|---|---|---|
| `security-known-bad` (auth + db files) | 2 critical paths | **2/2 inspected** |
| Benchmark aggregate critical recall | 2 | **100%** |
| Monorepo alias edge | 2 edges | 2 (after fix) |
| Python cross-package edge | `tests→pkg` | present |

Unit coverage: `critical.test.ts` (classification, per-category counts, warnings only for security-sensitive categories, silence when complete) and `pipeline.test.ts` (all-null fetch is now `partial` with a critical-path warning, not “complete”).

## Coverage dimensions now reported

`AnalysisCoverage` distinguishes:

- **file coverage** — inspected ÷ eligible files/bytes;
- **parser coverage** — parsed, failed, unsupported by depth;
- **critical-path coverage** — per category, path-based;
- **structural coverage** — unresolved internal imports and graph caps (`omittedModules`).

These are deliberately not combined into one “understanding” percentage.

## Real-repository validation — blocked

A fresh live scan during this milestone returned the route's `RATE_LIMITED` response (`resetAt 2026-11-05T01:14:30Z`) because the unauthenticated GitHub quota (60/h, shared per IP) was exhausted by earlier probes. The previous milestone's live run remains the last real-repository evidence:

| Repo | Eligible | Inspected | Coverage | Notes |
|---|---|---|---|---|
| `sindresorhus/p-map` | 14 | 14 | 100% | 5 edges, 0 unresolved |
| `expressjs/express` | 210 | 20 | 9.52% | partial with sampling + quota warnings |

No new real-repository recall figure is claimed.

## Blind spots (known)

- A path with `auth` in the name is prioritised; authentication implemented in `src/lib/session-store.ts` may be missed if it matches no rule. Classification cannot prove behaviour.
- Top-level docs/manifest caps can omit a monorepo package manifest that appears after the cap; workspace discovery then misses that package.
- Generated code can still be fetched if it does not match vendored/minified patterns.
- Byte-budget skips are reported in aggregate (`skippedForBudget`) but the individual skipped critical files are not listed.
- Selection is deterministic, but priority is heuristic: no benchmark measures “most important file” recall on real repositories.

## User-facing disclosure

The `/08` panel now shows inspected/eligible files and bytes, skipped-by-budget, unsupported source, parser-depth tallies and critical-category coverage. Warnings list every critical area that was not fully read.

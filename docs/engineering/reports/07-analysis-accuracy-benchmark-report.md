# 07 — Analysis Accuracy Benchmark

**Status:** VERIFIED for controlled fixtures · **Command:** `npm run benchmark` · **Artifacts:** `docs/engineering/benchmarks/latest.{json,md}`

---

## Why this exists

Passing unit tests proves functions behave as written; it does not prove findings are correct on a repository. This benchmark runs the **real pipeline** against fixtures whose expected findings, critical paths, graph edges and parser depths are declared in advance.

## Corpus (7 fixtures, all local)

| Case | Purpose |
|---|---|
| `security-known-bad` | committed `.env`, known token format, SQL interpolation, raw HTML sink |
| `quality-known-bad` | 90-line function, 21-point complexity, duplicate block in two files |
| `clean-small` | small documented TypeScript project — should produce none of the negative labels |
| `missing-docs` | 10 source files, no README, no licence file, no declared licence, no CI |
| `monorepo-alias` | workspace packages + `tsconfig` alias across directories |
| `python-service` | Python package with cross-module imports and tests |
| `unsupported-go` | Go module — imports only, no structure |

Fixtures are defined in `benchmarks/cases.ts` and executed by `benchmarks/runner.ts` through an injected fake GitHub client. No network, no quota, deterministic.

## Methodology

- **Expected** titles are positives; a missing one is a false negative.
- **Forbidden** titles are labelled negatives; a present one is a false positive.
- Any other detected title is **unlabelled** — listed but excluded from precision/recall (the corpus is not a complete label set).
- Precision = TP/(TP+FP), Recall = TP/(TP+FN), F1 harmonic mean. Computed only over labelled findings.
- Structural assertions are separate: parser-depth tally, minimum edges / a specific edge, and critical-path selection.
- No aggregate "accuracy %" is claimed beyond these labelled fixtures.

## Results (executed 2026-11-04)

| Case | Inspected | Coverage | Parsed | Nodes/Edges | TP | FP | FN | Time | Requests |
|---|---|---|---|---|---|---|---|---|---|
| security-known-bad | 8/8 | 100% | 4 | 2/1 | 4 | 0 | 0 | 42 ms | 8 |
| quality-known-bad | 7/7 | 100% | 4 | 2/0 | 3 | 0 | 0 | 16 ms | 7 |
| clean-small | 6/6 | 100% | 3 | 2/1 | 0 | 0 | 0 | 4 ms | 6 |
| missing-docs | 11/11 | 100% | 10 | 0/0 | 3 | 0 | 0 | 2 ms | 11 |
| monorepo-alias | 9/9 | 100% | 4 | 4/2 | 0 | 0 | 0 | 3 ms | 9 |
| python-service | 6/6 | 100% | 4 | 4/2 | 0 | 0 | 0 | 3 ms | 6 |
| unsupported-go | 3/3 | 100% | 1 | 1/0 | 0 | 0 | 0 | 2 ms | 3 |

**Totals:** TP 10 · FP 0 · FN 0 · Precision 100% · Recall 100% · F1 100%.
**Critical-path selection recall:** 2/2 (auth + data fixture files).
**Structural assertions:** 14/14 (capability depth and edge expectations, including `src→shared` alias and `tests→pkg` Python edge).

## Defects the benchmark found

1. **Monorepo alias edge missing.** With workspace packages present, `buildGraph` skipped top-level module nodes (`src`, `shared`), so the alias edge resolved to no node. Reported as 1 edge instead of 2. Fixed in `graph.ts`; regression test added to `graph.test.ts`.
2. **Trailing-source overstatement.** Follow-up audit found the AI brief reported `exactLocFiles` as `sourceFiles`. Fixed by adding `RepoStats.sourceFiles`.

Both defects survived the previous milestone's unit tests — evidence that fixture-labelled benchmarks test something the unit suite does not.

## What is *not* measured

- No public-repository corpus with pinned commit SHAs (the original brief asks for one). Creating a reproducible set requires network access and quota; the current quota is exhausted. This is an explicit gap, not a silent omission.
- No false-negative estimate for real repositories: a clean fixture proves the detector can fire, not that it fires on real code.
- Security pattern precision on real code is unknown; the corpus encodes exact, known patterns.

## Regression policy

Every future benchmark failure must either be fixed or the expectation must be changed **with a documented reason**. Expectations must never be weakened to make a run pass. The CI workflow runs the benchmark on every push/PR (`npm run benchmark`), and the generated Markdown is version-controlled evidence.

## Limitations

- Detector ground truth is derived from the detectors' own documented rules, so the benchmark is a **conformance** test, not an independent oracle.
- 7 fixtures cannot represent repository diversity; they are regression guards, not a statistical sample.
- Timing values are single-run and machine-specific; they show order of magnitude, not a benchmark score.

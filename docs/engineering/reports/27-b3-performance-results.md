# 27 — B3 Performance Results

**Date:** 2026-11-07
**Harness:** `benchmarks/b3-performance.test.ts`
**Status:** deterministic local measurement; not a production load test.

## Method

The harness builds synthetic repositories in memory, runs the real `runAnalysis()` pipeline with a fake `GitHubClient`, and records stage-independent totals. It does not use the network and does not overwrite the accuracy benchmark's historical artifacts.

- Fixed package-file counts: 30, 150 and 1,200.
- Mixed supported/unsupported source, tests, docs, manifests and workspace files.
- One malformed TypeScript file in the large fixture.
- Fixed generated content; no random seed is needed.
- `now` is fixed for deterministic output.
- Run with:

```bash
npx vitest run --config vitest.benchmark.config.ts
```

The artifact is also written to a temporary path under the machine's temp directory. It is not a release artifact.

## Environment

| Item | Value |
|---|---|
| OS | Windows, local developer machine |
| Node | v24.21.0 |
| Next | 15.5.29 |
| Vitest | 5.0.3 |
| Network | none |
| AI provider | none |

## Results

Latest run (2026-11-07):

| Case | Package files | Eligible files | Inspected | Coverage | Parsed | Parse failures | Graph nodes | Graph edges | Requests | Analysis ms | Wall ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| small-30 | 30 | 35 | 35 | 100% | 17 | 0 | 15 | 12 | 35 | 59 | 63.5 |
| medium-150 | 150 | 155 | 72 | 46.5% | 5 | 0 | 15 | 2 | 72 | 15 | 18.7 |
| large-1200 | 1,200 | 1,205 | 96 | 8% | 5 | 1 | 15 | 1 | 96 | 51 | 57.3 |

Measured heap deltas were +3.78 MB, −1.03 MB and −1.58 MB respectively. **These are not reliable memory measurements**: the values are affected by garbage collection and process warm-up. They are recorded only to show that no obvious runaway allocation appeared; they are not a memory benchmark.

## Interpretation

1. **Coverage is budget-limited, not time-limited.** The medium and large cases stop at the adaptive file budget, not at the 35-second scan deadline. The large case reads 96 of 1,205 eligible files by design. This is disclosed as `PARTIAL` and quantified in the report.
2. **The network request count dominates external cost.** A 35-file complete scan makes 35 blob requests plus metadata/tree; a 1,200-file scan still makes only 96 blob requests. Avoiding duplicate fetches matters more than micro-optimizing local parsing at these sizes.
3. **Parsing is not the bottleneck in this harness.** The 35-file case parses 17 files and completes the measured analysis in 59 ms; the large case parses 5 and completes in 51 ms. The difference is dominated by fixture shape and fetch simulation, not a demonstrated parser hotspot.
4. **Graph size is capped.** Graph nodes stay at 15 across fixtures because the fixture's import topology is intentionally small and the graph has limits. This is not evidence that huge real graphs are cheap; it is evidence that the synthetic graph did not grow with file count.
5. **The malformed file degrades rather than crashes.** The large case reports one parse failure, remains partial, and still returns a report.

## Optimization decision

No production code was optimized in B3.

A safe optimization needs a measured local cost that can be reduced without lowering coverage or changing analysis semantics. This harness did not identify one:

- The dominant cost is bounded GitHub I/O, not local CPU.
- Reducing parsing would silently reduce analysis quality.
- Increasing the file budget would increase quota spend.
- The graph is already bounded.
- No repeated parsing or duplicate fetch was observed in the measured path.

The useful performance work in B3 is therefore the harness, the explicit request-count measurements, and the reliability tests that prevent retry/partial-failure behavior from turning into a crash.

## Reliability measurements

`src/lib/analysis/pipeline-reliability.test.ts` uses the same fake-client approach and covers:

| Failure | Observed behavior |
|---|---|
| HTTP 500 on one blob | partial result; warning; inspected count reduced by one |
| HTTP 404 mid-scan | partial result; no uncaught exception |
| malformed TypeScript and Python | nonzero parse failures; partial result; warning |

Focused run: **15 tests passed** across the analyze route and reliability files.

## Limitations

- Synthetic fixtures are not real repositories.
- The fake client has no network latency, TLS, GitHub queuing or secondary-rate-limit behavior.
- Heap deltas are not reliable due to GC.
- No browser rendering performance, bundle-size regression or cold-start measurement was performed beyond the production build report.
- No load test was run against production or any shared service.

## Reproduction

```bash
BENCHMARK_OUT_DIR=/tmp/b3-bench npm run benchmark
npx vitest run src/lib/analysis/pipeline-reliability.test.ts src/app/api/analyze/route.test.ts
```

`BENCHMARK_OUT_DIR` affects only the accuracy benchmark's output directory; the performance harness always writes its JSON to the temporary directory. Neither command uses GitHub or an AI provider.

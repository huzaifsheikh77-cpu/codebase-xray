# Accuracy Benchmark

Reproducible, offline evaluation of the analysis engine against fixtures with declared ground truth.

## Run

```bash
npm run benchmark
```

Writes:

- `latest.json` — machine-readable per-case results and totals
- `latest.md` — human-readable report

Both are committed so a change in accuracy is visible in review.

## Layout

```
benchmarks/
  cases.ts            # fixtures + expectations
  runner.ts           # fake GitHub client + real pipeline + metrics
  accuracy.test.ts    # thresholds + artifact writer
```

## Adding a case

1. Add a `BenchmarkCase` to `cases.ts`: `files`, `license`, and `expected`.
2. `expected.issues` — titles that must be detected (missing ⇒ false negative).
3. `expected.forbidden` — titles that must not fire (present ⇒ false positive).
4. Optional: `criticalInspected`, `minEdges`, `edge`, `capability`.

Rules:

- Never weaken an expectation to make a run pass. Fix the engine or document the reason.
- Only label a finding as expected if the detector can prove it from the fixture.
- Keep fixtures small and deterministic; no network.

## Metrics

Precision = TP/(TP+FP), Recall = TP/(TP+FN), F1 = harmonic mean. Unlabelled detections are
reported but excluded from the ratios. Structural assertions are counted separately. No
"accuracy %" is reported for arbitrary repositories — this corpus is a conformance guard, not
a statistical sample.

## Release-gate isolation

`npm run release:gates` runs the documented gates with a tracked-tree guard. During that run
`BENCHMARK_OUT_DIR` points at a disposable directory, so the committed `latest.json`/`latest.md` are not
rewritten. The guard records tracked state before each gate, compares it afterwards, and stops with the
exact changed paths instead of restoring or staging anything. Update the canonical records only
intentionally, then review and commit that diff on its own.

## Historical snapshot

The committed `latest.json` and `latest.md` preserve the **2026-11-05** measured run. They were not regenerated for the 2026-11-07 B4.2 release candidate and must not be presented as fresh evidence for it. Rerun only intentionally (optionally with `BENCHMARK_OUT_DIR`) and review the resulting diff.

## Historical result (2026-11-05)

7 cases · TP 10 · FP 0 · FN 0 · structural 14/14 · critical recall 2/2.

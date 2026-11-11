# Analysis Accuracy Benchmark — historical snapshot (2026-11-05)

Generated: 2026-11-05T08:37:57.303Z
Engine: xray.engine v3.0.0

> **Historical snapshot — 2026-11-05.** This file preserves the original measured run and was not regenerated for the 2026-11-07 B4.2 release candidate. The measured values below are unchanged; do not present them as fresh candidate evidence.

> These metrics are measured against **controlled fixtures with explicit
> ground truth**. They validate the engine against its own documented rules;
> they are not a claim of accuracy on arbitrary public repositories.
> Unlabelled detections are listed but excluded from precision/recall.

## Totals

| Metric | Value |
|---|---|
| Labelled findings (TP) | 10 |
| False positives | 0 |
| Missed (FN) | 0 |
| Precision | 100.0% |
| Recall | 100.0% |
| F1 | 100.0% |
| Critical-path selection recall | 2/2 (100.0%) |
| Structural assertions | 14/14 |

## Cases

| Case | Inspected | Coverage | Parsed | Graph | TP | FP | FN | Time | Requests |
|---|---|---|---|---|---|---|---|---|---|
| security-known-bad | 8/8 | 100% | 4 | 3/1 | 4 | 0 | 0 | 43 ms | 8 |
| quality-known-bad | 7/7 | 100% | 4 | 1/0 | 3 | 0 | 0 | 15 ms | 7 |
| clean-small | 6/6 | 100% | 3 | 2/1 | 0 | 0 | 0 | 4 ms | 6 |
| missing-docs | 11/11 | 100% | 10 | 1/0 | 3 | 0 | 0 | 2 ms | 11 |
| monorepo-alias | 9/9 | 100% | 4 | 4/2 | 0 | 0 | 0 | 3 ms | 9 |
| python-service | 6/6 | 100% | 4 | 4/2 | 0 | 0 | 0 | 2 ms | 6 |
| unsupported-go | 3/3 | 100% | 1 | 1/0 | 0 | 0 | 0 | 2 ms | 3 |

## Detail

### security-known-bad

Committed env file, known token format, SQL interpolation and a raw HTML sink.

- inspected: 8/8 (100%) · parsed 4 · failures 0
- graph: 3 nodes / 1 edges · unresolved 0
- edges: tests->src
- findings: TP 4 · FP 0 · FN 0 · unlabelled 0
- detected: HARDCODED CREDENTIAL PATTERN, COMMITTED ENVIRONMENT FILE, SQL STRING INTERPOLATION, RAW HTML INJECTION SINK
- critical-path recall: 2/2
- structural assertions: capability pass · edges pass

### quality-known-bad

A 90-line function, a high-complexity function and an identical block in two files.

- inspected: 7/7 (100%) · parsed 4 · failures 0
- graph: 1 nodes / 0 edges · unresolved 0
- findings: TP 3 · FP 0 · FN 0 · unlabelled 0
- detected: LONG FUNCTION, HIGH CYCLOMATIC COMPLEXITY, DUPLICATED CODE BLOCK
- critical-path recall: 0/0
- structural assertions: capability pass · edges pass

### clean-small

Small, documented, licensed, CI-backed TypeScript project with clean imports.

- inspected: 6/6 (100%) · parsed 3 · failures 0
- graph: 2 nodes / 1 edges · unresolved 0
- edges: tests->src
- findings: TP 0 · FP 0 · FN 0 · unlabelled 0
- critical-path recall: 0/0
- structural assertions: capability pass · edges pass

### missing-docs

Ten source files with no README, no licence file, no declared licence and no CI.

- inspected: 11/11 (100%) · parsed 10 · failures 0
- graph: 1 nodes / 0 edges · unresolved 0
- findings: TP 3 · FP 0 · FN 0 · unlabelled 0
- detected: MISSING LICENSE, MISSING README, NO CI PIPELINE
- critical-path recall: 0/0
- structural assertions: capability pass · edges pass

### monorepo-alias

Workspace packages plus a tsconfig alias that resolves across directories.

- inspected: 9/9 (100%) · parsed 4 · failures 0
- graph: 4 nodes / 2 edges · unresolved 0
- edges: src->shared, packages/ui->packages/core
- findings: TP 0 · FP 0 · FN 0 · unlabelled 0
- critical-path recall: 0/0
- structural assertions: capability pass · edges pass

### python-service

Python package with cross-module imports and a test package.

- inspected: 6/6 (100%) · parsed 4 · failures 0
- graph: 4 nodes / 2 edges · unresolved 0
- edges: pkg->ext:click, tests->pkg
- findings: TP 0 · FP 0 · FN 0 · unlabelled 0
- critical-path recall: 0/0
- structural assertions: capability pass · edges pass

### unsupported-go

Go module: imports are extractable, structure and complexity are not.

- inspected: 3/3 (100%) · parsed 1 · failures 0
- graph: 1 nodes / 0 edges · unresolved 0
- findings: TP 0 · FP 0 · FN 0 · unlabelled 0
- critical-path recall: 0/0
- structural assertions: capability pass · edges pass

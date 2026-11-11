# 13 — Performance and Scalability

**Status:** PARTIALLY VERIFIED — bounded operation is verified; memory and real-repository latency are not measured

---

## Resource budgets (enforced)

| Limit | Value | Rationale |
|---|---|---|
| Tree entries processed | 100,000 (GitHub cap) + entry cap in `limits.ts` | upstream response limit |
| Files inspected | 48 / 72 / 96 / 128 by tier, hard ceiling 160 | keeps worst case bounded while reading small repos fully |
| Per-file size | 256 KiB | excludes minified bundles and assets |
| Total bytes | 6 / 8 / 10 / 12 MiB by tier | caps bandwidth and parse time |
| Concurrency | 8 (ceiling 10) | avoids GitHub secondary-rate-limit bursts |
| Deadline | 35 s default (ceiling 40 s) | inside the route's 60 s `maxDuration` |
| AI prompt | 24,000 chars; 900 output tokens | context and cost bound |
| Body sizes | 4 KiB analyse / 512 KiB AI | abuse bound |

Each limit is reported in `analysis.budget`; exceeding one marks the scan `partial` and emits a quantified warning.

## Measured (fixtures)

| Case | Files | Requests | Duration |
|---|---|---|---|
| security-known-bad | 8 | 8 | 42 ms |
| quality-known-bad | 7 | 7 | 16 ms |
| missing-docs | 11 | 11 | 2 ms |
| monorepo-alias | 9 | 9 | 3 ms |
| python-service | 6 | 6 | 3 ms |
| clean-small | 6 | 6 | 4 ms |
| unsupported-go | 3 | 3 | 2 ms |
| **Total corpus** | 50 | 50 | < 100 ms |

Requests = inspected files (fixtures use an in-memory client, so no repo/tree requests). In production a scan costs `2 + inspected` GitHub requests.

## Build and bundle

| Metric | Value |
|---|---|
| Production build | succeeds, ~8 s compile |
| `/` | 121 kB route · 224 kB First Load JS |
| API routes | 103 kB First Load JS (server-only code not shipped) |
| Test suite | 19 files / 109 tests in ~4 s |
| Benchmark suite | 7 fixtures in ~1 s |

## Degradation behaviour (verified)

- Sampling: `SAMPLED COVERAGE — X OF Y ELIGIBLE FILES READ (Z%)`.
- Budget exhausted: `FETCH BUDGET REACHED`.
- Mid-scan 403: `GITHUB RATE LIMIT REACHED MID-SCAN`; completed findings retained.
- Truncated tree: `TREE TRUNCATED BY GITHUB`.
- Nothing fetched: scan is `partial` with a critical-path warning (regression test).

A partial scan is never labelled complete, and completed findings are preserved rather than discarded.

## Not measured

- **Memory**: no heap sampling; the sample is bounded (≤ 12 MiB of text plus ASTs for ≤ 128 files), but peak RSS is not recorded.
- **Real-repository latency distribution**: `durationMs` is reported per scan, but no multi-run benchmark was captured this milestone (quota exhausted).
- **Concurrency behaviour under load**: the per-instance limiter and 8-way fetch pool are bounded by design, not load-tested.
- **Cold start**: not measured.

## Scaling risks

1. Unauthenticated GitHub quota is the binding constraint, not CPU: 60 requests/hour cannot support even one medium scan.
2. AST parsing is proportional to fetched bytes; the 12 MiB ceiling bounds it, but a 128-file TypeScript monorepo will be noticeably slower than a 6-file fixture.
3. In-memory rate limiting does not scale horizontally (Report 12).
4. No caching: identical scans repeat identical API work.

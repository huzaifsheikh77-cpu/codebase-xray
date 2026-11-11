# 15 — Testing and CI

**Status:** VERIFIED locally · CI workflow defined but not executed on GitHub

---

## Executed results (final)

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, 0 errors |
| `npm run lint` | exit 0, 0 errors |
| `npm test` | **19 files / 110 tests passed** (exit 0) |
| `npm run benchmark` | 7 fixtures, 1 test passed (exit 0) |
| `npm run build` | exit 0 (Next 15.5.29) |
| `npm audit --omit=dev` | 2 vulnerabilities (1 high, 1 moderate) |

Before this milestone: 13 files / 87 tests. Added: 8 frontend tests, 2 service tests, 3 capability tests, 5 critical tests, 1 graph/source regression — plus the benchmark suite.

## Test inventory by category

| Category | Files | Notes |
|---|---|---|
| Unit (utils/URL/rate limit) | 3 | URL parsing (22 cases), limiter, guards |
| Analysis engine | 8 | pipeline, budgets, tree priority, quality, graph, capabilities, critical, parsers |
| Extractors | 2 | dependencies, security redaction |
| Scoring | 1 | damping/neutral/confidence |
| AI contracts | 2 | validation (6), service (5, injected provider) |
| API routes | 1 | 8 validation/limit cases |
| Frontend components | 3 | 8 jsdom tests |
| Benchmark | 1 | 7-fixture corpus, writes artifacts |

## Regression scenarios covered

Zero findings · root-level modules · alias resolution · unresolved imports · type-only imports · workspace edges · monorepo alias + workspaces · truncated tree · sampled coverage · fetch-budget exhaustion · mid-scan rate limit · all-null fetch (partial) · syntax diagnostics counted · unsupported source counted · critical-path warnings · budget clamps · invalid AI citations · invented paths · unknown finding IDs · empty AI answer · provider error · AI unavailable · rate limiting · body caps · cross-origin rejection.

Not covered: circular-dependency detection (not implemented), concurrent scans under load, real GitHub failures beyond the fake-client cases, browser-level journeys.

## CI

`.github/workflows/ci.yml` (Node 22, npm cache, 15 min):

```
npm ci → lint → typecheck → npm test → npm run benchmark → next build
```

Deterministic: both suites use fixtures and make no network calls; the AI is tested only through an injected provider, so no key is needed.

**Not executed on GitHub** — no remote workflow run was authorised/performed. The identical commands were executed locally and all passed.

## Testing gaps (honest)

1. No browser automation (Playwright/Cypress) — UI flows beyond component render are unverified.
2. No memory/load testing.
3. No mutation testing; coverage percentage was never measured, so none is reported.
4. Benchmark ground truth is conformance-based, not an independent oracle.
5. AI live behaviour is untested (no credentials).

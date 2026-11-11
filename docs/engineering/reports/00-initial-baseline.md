# 00 — INITIAL BASELINE (pre-transformation)

**Date:** 2026-11-04
**Repository:** `D:\CODEBASEXRAY` (branch `master`, commit `e287e07`, 86 tracked files)
**Working tree at start:** clean except untracked `.cloud-attachments/`
**Method:** full read of `src/**`, all config, all tests; executed `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm audit`; production server probed over HTTP.

This document describes the project **exactly as it was before any change in this assignment**. It is the reference point for every later report.

---

## A. Executive Summary

Codebase X-Ray is a single-page Next.js 15 application that analyses a public GitHub repository and renders a one-page engineering-health report. At baseline it is a **functional beta**: the deterministic engine works on real repositories, the demo works offline, build/lint/typecheck/tests are green — but it has no persistence, no accounts, no sharing/export, no CI, no licence, no frontend tests, one render crash, and a demo payload that advertises detectors the engine does not contain.

## B. Architecture (baseline)

```
Browser (all client components)
  XRayExperience  →  phase machine idle → scanning → complete | error
                  →  rAF timer over SCAN_STAGES (fixed 6200 ms)
                  →  fetch POST /api/analyze in parallel
                  →  results gated on (timer done AND response arrived)
        │
  app/api/analyze/route.ts   runtime=nodejs, force-dynamic, maxDuration=60
    origin check → 4 KiB body cap → 6/min per-IP limiter → JSON parse
    → demo branch (demo:true or url contains "nebula-labs/orbit-forge")
    → parseRepoUrl → HttpGitHubClient → runAnalysis
        │
  lib/github/client.ts  — the only network module; ETag LRU(64); error classification
        │
  lib/analysis/pipeline.ts  runAnalysis(client, {owner, repo, now})
    getRepo → getTree → pruneEntries → prioritize → ≤24 blobs (mapPool 6, 25 s, 3 MiB)
    → AnalysisContext (plain data) → 6 extractors → detectors → 6 sector scores
    → overall → insights → graph → system status → RepoAnalysis
        │
  PresentationLayer: /00 SYS · /02 score · /03 structure · /04 map · /05 issues
                     /06 insights · /07 status · footer
```

Key invariant: `src/lib/analysis/**` never imports the HTTP client. `runAnalysis` accepts any `GitHubClient`, which is why the test suite runs without GitHub quota.

## C. Technology stack (verified)

| Layer | Version / choice |
|---|---|
| Framework | Next.js 15.5.27 (App Router) |
| UI | React 19.1.0, all client components |
| Language | TypeScript 5, `strict: true` |
| Styling | Tailwind CSS 4 (`@tailwindcss/postcss`), `@theme` tokens in `app/globals.css` |
| Charts | Recharts ^3.10.1 (single language bar chart) |
| Icons | lucide-react ^1.52.0 |
| Tests | Vitest ^5.0.3, `environment: "node"` |
| Lint | ESLint 9 flat config + `next/core-web-vitals` + `next/typescript` |
| Runtime | Node >= 20.9 (executed on v24.21.0), npm 11.19.0 |
| Database | none |
| Auth | none |
| AI/LLM | none |
| External services | GitHub REST only |

## D. Existing functionality (baseline)

Live analysis of public repositories; offline demo fixture; URL validation; file/LOC statistics (exact for fetched files, estimated from tree bytes otherwise); language mix; dependency counts from root manifests (npm, pip, Cargo, Go, Maven, Gradle, RubyGems, Composer); testing/docs/security/architecture signals; conservative secret scanning with redaction; module graph from workspace globs + import regex; 8 issue detector families; 6 weighted sector scores; 6 rule-based insights; system status; partial/degradation banners; typed error states; per-instance rate limiting; accessible tree/tablist/scrollspy; security headers.

## E. Verified test and build results (baseline)

| Command | Result |
|---|---|
| `npm test` | PASS — 8 files, 63 tests, 1.64 s |
| `npm run typecheck` | PASS — exit 0 |
| `npm run lint` | PASS — exit 0, no warnings |
| `npm run build` | PASS — `/` 117 kB page / 220 kB first load; `/api/analyze` 123 B |
| `npm audit` | **8 vulnerabilities** — 1 critical (`next`), 1 high (`postcss`), 6 moderate (dev `@typescript-eslint` chain) |

Runtime probes against `next start`:

| Probe | Result |
|---|---|
| `GET /` | 200, 14,629 B; six security headers; no `X-Powered-By` |
| `POST /api/analyze` demo | 200, `isDemoData:true`, score 82, 9 issues, 6 insights, 11 nodes |
| `POST` `octocat/Hello-World` | 200 in 2721 ms — score 55, 1 file, 2 issues, 0 nodes |
| `POST` `sindresorhus/p-map` | 200 in 3195 ms — 17 files / 14 inspected, 2 issues, **6 nodes / 0 edges** |
| `POST` `gitlab.com/a/b` | 400 `MALFORMED_URL` |
| `GET /api/analyze` | 405 |
| malformed JSON | 400 |
| oversized body | 413 |
| foreign `Origin` | 403 |

## F. Known bugs and integrity problems (baseline)

1. **`IssuesSection` crashes when `issues` is empty** — `selected` is `undefined`, `selected.id` is dereferenced. No zero-issue branch exists.
2. **Graph produces no edges for root-level files** — `fromDir` for `index.js` resolves to `"index.js"`, matching no node. Proven on `sindresorhus/p-map` (6 nodes, 0 edges).
3. **TypeScript path aliases never resolve** — `@/…` is treated as a bare specifier; no tsconfig `paths` parsing.
4. **Scoring damping applied to only 4 of 6 sectors** — `scoreSecurity` and `scoreDocumentation` bypass `damp()`, so `octocat/Hello-World` scored **security 100 / documentation 15**.
5. **Client/server URL validation disagree** — the form regex requires a `github.com/` host and rejects `owner/repo`, `.git`, `/tree/…`; the server accepts them.
6. **Demo fixture advertises non-existent capabilities** — cycle detection, churn analysis, branch coverage 38 %, GHSA advisories, duplication similarity, doc drift, cyclomatic complexity, type coverage, plus `AI ENGINE ready / insight.model v1.4`.
7. **Fabricated live telemetry** — the scan overlay prints "cloning @ 12.4 MB/s", "ast parse: ts/tsx/py/go", "rate-limit budget: 4,981 / 5,000" during real scans.
8. **Artificial 6.2 s minimum latency** — real scans complete in ~3 s but results are withheld until the timer elapses.
9. **Quota architecture** — 26 requests/scan against an anonymous 60/hour budget, with a per-instance 6/min limiter keyed on spoofable `x-forwarded-for`.
10. **Dead code** — `ui/empty-state.tsx` (unused `EmptyState` + duplicate `ErrorState`), `ui/score-pill.tsx`, `formatDate`, `pad2`, `languageColor`, `countAllFiles`, `hasGitHubToken`, `LIMITS.requestTimeoutMs`, `GitHubClient.rateLimit()`.
11. **Copy defects** — pipeline warning says "ANALYSIS SKIPPED" but analysis continues; `REPO_TOO_LARGE` is never emitted; footer links are `href="#"`.
12. **No frontend tests**, no CI, no licence, no deployment configuration, no persistence.

## G. Analysis limitations (baseline)

24-file sample regardless of repository size; LOC and language shares estimated from bytes for unfetched files; dependencies read from root manifests only; imports detected by regex with no AST and no alias resolution; only ~7 secret patterns, 4,000 lines/file, 20 findings; no code execution; 25 s pipeline deadline inside a 60 s route; Node runtime required (`Buffer`).

## H. Git status (baseline)

```
branch: master
commit: e287e07 feat: complete Codebase X-Ray repository analysis
untracked: .cloud-attachments/
```

No user modifications were present, so no work was at risk of being overwritten.

## I. Recommended implementation sequence

1. Stabilisation: zero-issue crash, empty states, dead code, URL parity, damping, honest demo/telemetry, remove artificial delay.
2. Core engine: adaptive budgets, parser registry (TypeScript compiler API + Python heuristic + generic), alias-aware import resolution, root-file graph nodes, quality metrics, expanded security rules, measured coverage disclosure.
3. Evidence and scoring: unified evidence/confidence model, `scoringVersion`, coverage reporting, report sections.
4. AI layer: provider-independent abstraction, evidence-grounded context, validation, disabled state without credentials.
5. Quality and production: frontend tests, benchmarks, dependency upgrades, CI, documentation.

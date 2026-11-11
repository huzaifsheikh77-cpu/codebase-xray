# 05 — Quality, Security and Production Readiness

> **Historical record.** Several blockers listed below were addressed in the B1 batch: shared atomic quota, private-repository rejection, streamed body caps, AI binding/validation and admission control. See `../CODEBASE_XRAY_MASTER_STATUS.md` for the current state.

**Phase:** 5 of 5 · **Status:** PARTIALLY COMPLETED — CI added, dependencies patched, production blockers remain

---

## A. Executive Summary

The verification pipeline now runs lint → typecheck → 87 tests → production build, both locally and in a new GitHub Actions workflow. The critical Next.js advisory was resolved by a patch upgrade to 15.5.29. Live probes on the production build confirmed the engine, coverage disclosure, degradation under quota exhaustion and the AI disabled state.

Remaining production blockers are honest and specific: no licence, no frontend component tests, a per-instance rate limiter, unauthenticated GitHub quota, no persistence, and one high-severity `postcss` advisory nested inside Next.js.

## B. Original Problems

- No CI; verification depended on manual runs.
- `npm audit` reported 8 advisories, including a **critical** in Next.js and a high in `postcss`.
- No frontend tests; no test covered the zero-issue crash before Phase 1.
- No benchmarks or resource measurements.
- No licence, no environment documentation for the new AI/budget variables.
- No production-readiness statement.

## C. Work Completed

### Verification and CI

`.github/workflows/ci.yml` runs on push/PR: `npm ci` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`, Node 22, 15-minute timeout, telemetry disabled. The workflow has **not** been executed on GitHub (no remote run was authorised); the identical command sequence was executed locally.

### Dependency maintenance

| Package | Before | After | Reason |
|---|---|---|---|
| `next` | 15.5.27 | 15.5.29 | Critical advisory (Image Optimization RCE, App Router DoS) |
| `typescript` | devDependency | `dependencies` | Runtime AST parsing |
| `postcss` (nested) | 8.5.x | unchanged | Only fixable by a Next.js version outside the current range |

`npm audit --omit=dev` before: 2 (1 critical, 1 high). After: **2 (1 high, 1 moderate)** — the critical is gone; the remaining high is the `postcss` copy bundled inside `next`.

### Benchmarks and live probes

All against `next start` on the production build, no `GITHUB_TOKEN`:

| Repository | Total / eligible | Inspected | Coverage | Parsed | Unresolved | Nodes / edges | Issues | Score | Partial |
|---|---|---|---|---|---|---|---|---|---|
| `octocat/Hello-World` | 1 / 1 | 1 | 100% | 0 | 0 | 0 / 0 | 2 | 53 | no |
| `sindresorhus/p-map` | 17 / 14 | 14 | 100% | 7 | 0 | 9 / 5 | 10 | 55 | no |
| `expressjs/express` | 216 / 210 | 20 | 9.52% | 18 | 16 | 12 / 4 | 10 | 58 | **yes** |
| demo fixture (fictional) | 1,180 / 1,180 | 1,180 | 100% (fictional) | 642 | 6 | 11 / 13 | 6 | 68 | no |

`express` exhausted the unauthenticated quota at 20 of a planned 72 files. The response carried:

```
SAMPLED COVERAGE — 20 OF 210 ELIGIBLE FILES READ (9.52%); BUDGET 72 FILES (MEDIUM TIER)
FETCH BUDGET REACHED — 20 OF 72 PRIORITIZED FILES INSPECTED
GITHUB RATE LIMIT REACHED MID-SCAN — 20 OF 72 PRIORITIZED FILES INSPECTED
```

That is the intended behaviour: useful partial output plus an exact account of what was missed.

### Performance observations

| Measurement | Value |
|---|---|
| Production build | succeeds; Next compile ~8 s |
| Client bundle `/` | 121 kB route, 224 kB First Load JS (was 117/220 kB) |
| Client bundle API routes | 103 kB First Load JS (server-only code not shipped) |
| Scan requests | `1 + 1 + inspectedFiles` (e.g. p-map = 16) |
| Concurrent fetches | 8 |
| Max scan bytes | tier-dependent, 6–12 MiB |
| Per-file cap | 256 KiB |
| Test suite runtime | ~1.7 s for 87 tests |

Scan wall-clock time was not instrumented in this phase; no duration claim is made.

## D. Files Created

- `.github/workflows/ci.yml`
- `docs/engineering/reports/01`–`05`, `CODEBASE_XRAY_MASTER_STATUS.md`, `CODEBASE_XRAY_FINAL_ENGINEERING_REPORT.md`

## E. Files Modified

- `package.json` / `package-lock.json` — Next patch upgrade; `typescript` to dependencies.
- `.env.example` — GitHub token, AI variables, budget overrides.
- `README.md` — engine description, parser capability, coverage, quota maths, limitations, licence statement.

## F. Architecture Changes

None in this phase beyond dependency versions and CI. The architecture is documented in Report 02.

## G. Features Implemented

- Automated verification (CI definition + local green run).
- Patched critical dependency.
- Documented environment contract, including the disabled AI state.
- Explicit limitations and production blockers in the README.

## H. Features Partially Implemented

- **CI is defined but unexecuted on GitHub.**
- **Frontend tests** are not present. The environment has no `jsdom`/`@testing-library/react`; installing them requires a network fetch that was not attempted. UI behaviour is covered only indirectly by server tests and manual probes.
- **Accessibility** was not audited with tooling or assistive technology.
- **Rate limiting** remains per-instance, in-memory and keyed on `x-forwarded-for`.
- **Benchmarks** use three public repositories; no labelled corpus, so no precision/recall claim.

## I. Bugs Fixed

- Critical Next.js advisory (upgrade).
- Zero-issue crash, graph root, aliasing, damping, demo claims (Phases 1–3, re-verified here).
- Stale-response overwrite guarded by a token in `xray-experience.tsx`.

## J. Testing Results

Final sequence, executed locally on Windows (Node v24.21.0, npm 11.19.0, Next 15.5.29):

```
npm run typecheck  → exit 0
npm run lint       → exit 0
npm test           → 13 files, 87 tests, all passed (exit 0)
npm run build      → exit 0
npm audit --omit=dev → 2 vulnerabilities (1 high, 1 moderate)
```

Runtime smoke on the final build:

```
GET  /                      → 200
POST /api/analyze (demo)    → 200, demo=true, 11 nodes / 13 edges / 6 issues
POST /api/ai   (no key)     → 503 AI_UNAVAILABLE
```

## K. Accuracy and Benchmark Results

Reported in full in Report 02/05 tables. No accuracy percentage is claimed. Known false-negative sources: sampled files outside the fetch budget, Python/other-language parsing limits, root-manifest-only dependency extraction, and graph node/edge caps.

## L. Security Implications

### Fixed / improved

- Critical Next.js RCE/DoS advisory resolved.
- Same-origin enforcement and streaming body caps on both POST routes.
- Secrets redacted at detection; AI key server-only.
- AI responses validated; citations to unknown evidence rejected.
- No repository code is executed anywhere.

### Remaining

1. **`postcss` high advisory** nested in Next.js; the audit's only fix path is outside the current Next range. Not exploitable through this app's own build pipeline in a way that was demonstrated, but it remains reported.
2. **Rate limiter is per-instance and IP-header based** — not a shared quota control. A public deployment can exceed GitHub's 60/hour unauthenticated limit with a single large scan, and the `ai:` bucket does not protect the operator's credits across instances.
3. **No authentication or per-user quotas** — the API is open to anyone who can reach it (subject to CORS-style origin checks, which browsers honour but scripts do not).
4. **No Content-Security-Policy or security headers** configured in `next.config.ts`.
5. **No licence** — legally unclear reuse.

## M. Performance Implications

Documented above. The main regression is bundle size (+4 kB route, +4 kB First Load JS) from the two new panels; the compiler stays server-side. Adaptive budgets cap the worst case rather than allowing unbounded scans.

## N. Dependencies

`next` 15.5.27 → 15.5.29; `typescript` promoted to runtime. No paid service, database, analytics or AI SDK added. The AI layer uses `fetch`.

## O. Remaining Issues

| Blocker | Impact | Mitigation path |
|---|---|---|
| No licence | Cannot be legally reused | Owner chooses MIT/Apache-2.0 |
| GitHub quota 60/h unauthenticated | Large scans cannot complete | Require `GITHUB_TOKEN`; add shared cache/limiter |
| Per-instance rate limiter | Quota and AI credits unprotected | Move to a shared store |
| No frontend tests | UI regressions undetected | Add jsdom + Testing Library |
| No auth/quotas | Open API surface | Add auth or deploy privately |
| `postcss` advisory | Reported vulnerability | Track Next.js release with patched postcss |
| No security headers | Weaker browser hardening | Add CSP/HSTS in `next.config.ts` |
| AI provider unverified | Unknown real-world behaviour | Supply a key and run the documented test matrix |
| No persistence | No history/sharing/export | Out of scope for this assignment |

## P. Next Phase (recommended)

1. Choose a licence and add it.
2. Require a GitHub token and replace the in-memory limiter with a shared store.
3. Add frontend tests for the form, zero-issue state, coverage panel and AI disabled state.
4. Add security headers and a CSP.
5. Verify the AI provider path with a real key, including timeout and 5xx handling.
6. Add an accuracy corpus with labelled expectations before publishing any accuracy claim.

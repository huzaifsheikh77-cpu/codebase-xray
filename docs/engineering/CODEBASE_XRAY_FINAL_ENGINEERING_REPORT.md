# CODEBASE XRAY — FINAL ENGINEERING REPORT

> **Historical record (2026-11-04).** The per-instance limiter and unauthenticated quota risks below were addressed by the B1 batch: shared atomic consume, admission control, hourly budget and private-repository rejection. Current status is in `CODEBASE_XRAY_MASTER_STATUS.md`.

**Transformation:** `xray.engine v2.7.3` → `xray.engine v3.0.0`
**Scoring:** `xray.score v3.0.0`
**Framework:** Next.js 15.5.29 · React 19 · TypeScript 5 (strict) · Vitest 5
**Date:** 2026-11-04

---

## 1. Original project condition

Codebase X-Ray already had a coherent product: a one-page engineering report, a deterministic pipeline over an injected GitHub client, honest `DEMO`/`LIVE` labelling, and a green baseline (8 test files, 63 tests). Its weaknesses were depth and self-knowledge:

- a hard 24-file sample with no coverage metric;
- regex-only extraction presented as analysis;
- an import graph that lost root-level files (p-map: 6 nodes, **0 edges**) and ignored `tsconfig` aliases;
- scoring that damped only four of six sectors, so a one-file repository could score 100/100;
- a demo advertising cycle detection, churn, branch coverage, CVE advisories and semantic duplication that did not exist;
- invented scan telemetry and a 6.2 s artificial result delay;
- a crash on zero-issue repositories;
- no AI layer, while status copy implied a model was available.

## 2. Final architecture

```
Browser (React 19, client components)
  ├── URL validation via the same parser as the API
  ├── demo mode (local fixture, no network)
  └── live mode → POST /api/analyze
                        │
        request guards (same-origin, streamed body cap, rate limit)
                        │
        planBudget → prune → prioritize → bounded fetch (HttpGitHubClient)
                        │
        parser registry (TS AST / Python structural / generic imports)
                        │
        extractors: stats · dependencies · testing · docs · security · architecture
        quality · security rules · architecture profile
                        │
        graph (root node, aliases, workspaces, unresolved count)
                        │
        detectors → sectors (v3) → insights → coverage/budget
                        │
        RepoAnalysis JSON → /00 … /09
                        │
        optional POST /api/ai → brief → provider → validated answer
```

Two layers remain strictly separated: the engine **discovers and measures**; AI **explains and advises**. The engine imports nothing from `src/lib/ai/` except a secret-free status object.

## 3. Final technology stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5.29 (App Router, Node runtime) |
| UI | React 19, Tailwind CSS 4, SVG graphs, Recharts |
| Language | TypeScript 5 strict |
| Parsing | TypeScript compiler API (server-only, `serverExternalPackages`) |
| Tests | Vitest 5 (node environment) |
| CI | GitHub Actions (lint → typecheck → test → build) |
| AI | Any OpenAI-compatible endpoint, optional |
| Persistence | None |

## 4. Analysis modules

| Module | Role |
|---|---|
| `analysis/pipeline.ts` | Orchestration, budgets, coverage, assembly |
| `analysis/budgets.ts` | Adaptive tiers and absolute ceilings |
| `analysis/parsers/*` | Language-aware parsing and aggregate summary |
| `analysis/tree-utils.ts` | Pruning, classification, prioritisation |
| `analysis/extractors/*` | Stats, dependencies, testing, docs, security, architecture |
| `analysis/quality.ts` | Function spans, params, complexity proxy, duplicates |
| `analysis/security-rules.ts` | Credential and risk patterns, redacted |
| `analysis/architecture-profile.ts` | Evidence-backed pattern inference |
| `analysis/graph.ts` | Nodes, aliases, edges, unresolved imports |
| `analysis/issues/detectors.ts` | Evidence-complete findings |
| `analysis/scoring/*` | Versioned weights, damping, confidence |
| `analysis/insights.ts` | Prioritisation and confidence mapping |
| `analysis/status.ts` | System status from real configuration |

## 5. Parser capabilities

| Parser | Languages | Method | Extracts | Honest limit |
|---|---|---|---|---|
| TypeScript | ts, tsx, mts, cts, js, jsx, mjs, cjs | `ts.createSourceFile` | imports (static/type/dynamic/require), exports, function spans, params, complexity, classes, TODOs | parse diagnostics reported; no type checking |
| Python | py | indentation + structure scan | imports, defs, classes, params, decision points | **not an AST** |
| Generic | Go, Rust, Java, C#, Ruby, PHP, C/C++, Swift, Kotlin | import-line scan | imports, TODOs | no structure or metrics |

Only the TypeScript parser sets `ast: true`; the UI and reports derive "AST languages" from that flag.

## 6. Repository inspection methodology

1. Repository metadata.
2. Recursive tree (truncation detected).
3. Prune ignored/binary/oversized (> 256 KiB) files, counted.
4. Classify and prioritise: README → manifests → workspace manifests → entry/config → source → tests → docs → other → vendored/minified.
5. `planBudget(eligible)` selects 48/72/96/128 files (override clamped to 160), with 6–12 MiB, 8 concurrency and a 35 s default deadline (40 s ceiling).
6. Fetch with bounded concurrency; per-file failures are recorded, not fatal.
7. Parse, analyse, score.
8. Emit inspected/eligible files and bytes, parsed files, failures, unresolved imports, truncation and the budget.

## 7. Evidence architecture

Every finding carries `id, category, title, severity, confidence, detectionMethod, file, line, detail, evidence[], limitation?, recommendation, affectedFiles?`.

Confidence vocabulary: `verified` (exact measurement), `high` (deterministic detection), `heuristic` (structural inference), `incomplete` (insufficient evidence). Evidence strings are minimal and redacted; no source file is returned.

## 8. Scoring methodology

Six sectors weighted 0.20/0.20/0.15/0.15/0.15/0.15. Every sector applies the same damping toward 50 based on source count and LOC, and reports a confidence label. Empty sectors return exactly 50 and say so. Methodology is versioned (`xray.score v3.0.0`). Testing uses a test/source **file ratio** — never an inferred coverage percentage.

## 9. AI architecture

`config → context (RepoBrief) → prompts → provider → validate → service`, exposed at `POST /api/ai`. The provider receives counts, scores, findings and known paths — **never file contents**. Responses must be strict JSON; citations to unknown paths or issue IDs are dropped and counted. No key → `503 AI_UNAVAILABLE`.

## 10. AI features implemented

- Explain a finding; explain architecture; codebase chat; recommendations.
- Three explanation levels (beginner/developer/engineering) over identical evidence.
- Disabled, loading, error and success states; privacy notice; citation display.

## 11. Security safeguards

- Server-only secrets; secret-free public status.
- Same-origin checks and streamed body caps on both POST routes.
- Independent rate-limit bucket for AI.
- Credential redaction at detection; test asserts values never appear.
- Response-schema validation and citation rejection.
- Repository text delimited and labelled untrusted in prompts.
- No code execution at any point.

## 12. Benchmark results

| Repository | Total/eligible | Inspected | Coverage | Parsed | Unresolved | Nodes/edges | Issues | Score | Partial |
|---|---|---|---|---|---|---|---|---|---|
| octocat/Hello-World | 1/1 | 1 | 100% | 0 | 0 | 0/0 | 2 | 53 | no |
| sindresorhus/p-map | 17/14 | 14 | 100% | 7 | 0 | 9/5 | 10 | 55 | no |
| expressjs/express | 216/210 | 20 | 9.52% | 18 | 16 | 12/4 | 10 | 58 | **yes** |
| demo fixture | 1,180/1,180 | 1,180 | 100% (fictional) | 642 | 6 | 11/13 | 6 | 68 | no |

No accuracy percentage is asserted: no labelled ground-truth corpus exists. The p-map result is a verified **behavioural** fix (0 → 5 edges), not an accuracy metric.

## 13. Testing results

```
npm run typecheck → exit 0
npm run lint      → exit 0
npm test          → 13 files / 87 tests passed (exit 0)
npm run build     → exit 0 (Next 15.5.29)
```

Coverage: URL parsing, request guards, rate limiting, pipeline (10), pruning/prioritisation, dependencies, security redaction, scoring, budgets, parser registry/capability, graph resolution, quality metrics, AI validation, API validation.

**Not tested:** frontend components, live AI provider, CI on GitHub, accessibility.

## 14. Performance measurements

| Metric | Value |
|---|---|
| Build | succeeds, ~8 s compile |
| `/` bundle | 121 kB route / 224 kB First Load JS |
| API routes | 103 kB First Load JS (server-only) |
| Requests per scan | 2 + inspected files (p-map: 16) |
| Concurrency | 8 |
| Suite runtime | ~1.7 s |

Scan latency was not instrumented; no claim is made.

## 15. Remaining limitations

- Sampling is prioritised, not statistically representative.
- LOC/language outside fetched files are estimated from tree bytes.
- Dependencies are root-manifest level; no transitive or lockfile graph.
- Python/other languages are not AST-parsed.
- Duplicate detection is a 6-line normalised-block similarity signal.
- Graph capped at 32 nodes / 60 edges.
- No CVE feed, no execution, no coverage ingestion.
- 14-section report outline realised as 10 panels.

## 16. Production readiness

**Not production-ready for public, unauthenticated traffic.** The engine is stable and honest; the operational envelope is not.

## 17. Environment setup

```bash
npm ci
cp .env.example .env.local     # optional
npm run dev                    # http://localhost:3210
npm run build && npm start     # http://localhost:3000
```

## 18. Required external credentials

| Variable | Required | Effect if absent |
|---|---|---|
| `GITHUB_TOKEN` | **Effectively yes for public use** | 60 requests/hour unauthenticated; large scans truncate at quota |
| `AI_API_KEY` (or `OPENAI_API_KEY`) | No | Assistant disabled (`503`), engine unaffected |
| `AI_MODEL` | No | `gpt-4o-mini` |
| `AI_BASE_URL` | No | `https://api.openai.com/v1` |
| `ANALYSIS_MAX_FILES` / `ANALYSIS_CONCURRENCY` | No | Adaptive defaults |

## 19. Deployment requirements

- Node runtime (not Edge): `Buffer` and the TypeScript compiler.
- Standard Next.js build; no database or migrations.
- Server-side environment variables; no `NEXT_PUBLIC_` secrets.
- A shared rate limiter is required before public exposure (current limiter is per-instance).

## 20. Recommended next milestone

**Trustworthy public beta:** licence, token-backed quota with a shared limiter, frontend tests for form/zero-issue/coverage/AI-disabled, security headers, and a verified AI provider round-trip. Then a labelled accuracy corpus before any accuracy claim is published.

---

## Before and after

| Dimension | Before | After |
|---|---|---|
| Engine version | `xray.engine v2.7.3` | `xray.engine v3.0.0` |
| Inspection | 24 files, fixed | 48/72/96/128 adaptive, byte/concurrency/deadline bounds |
| Coverage disclosure | none | files, bytes, parsed, failures, unresolved, truncation, budget |
| Parsing | regex only | TS AST + structural Python + generic imports, each self-declared |
| Graph (p-map) | 6 nodes / 0 edges | 9 nodes / 5 edges, 0 unresolved |
| Aliases | none | `tsconfig`/`jsconfig` paths + baseUrl |
| Quality metrics | none measured | function spans, params, complexity proxy, duplicates |
| Security | few patterns | credentials + 10 risk classes, redacted, with verification |
| Scoring | 4/6 sectors damped | all 6 damped, confidence-labelled, versioned |
| Zero-issue UI | crash | empty state, filters safe |
| Demo | claimed unimplemented features | claims only implemented detectors |
| Telemetry | fabricated | labelled illustrative; real counts only |
| Result latency | 6.2 s artificial floor | immediate on response |
| AI | none, status implied availability | optional, validated, fail-closed |
| Tests | 8 files / 63 | 13 files / 87 |
| CI | none | GitHub Actions workflow |
| Next.js | 15.5.27 (critical advisory) | 15.5.29 (critical resolved) |
| Docs | baseline only | six reports + master status + this report |

---

# CODEBASE XRAY — CURRENT ENGINEERING STATE

*Self-contained handoff for the next engineer.*

## What it does

Codebase X-Ray inspects a public GitHub repository — metadata, a pruned tree and a bounded, prioritised sample of files — and produces a deterministic engineering report: statistics, language mix, module graph, six sector scores, evidence-backed findings, coverage disclosure and an optional AI explanation layer.

## What the core engine can actually analyse

- Repository metadata, tree composition, ignored/binary/oversized exclusions.
- Language distribution, exact LOC for fetched files, estimated LOC elsewhere.
- Imports and exports with line numbers; function spans, params, complexity proxies; classes.
- Duplicate 6-line blocks across fetched files.
- Credential patterns (redacted) and ten classes of risk pattern.
- Test/source ratio, frameworks, CI presence, docs/licence/security-policy presence.
- Workspace packages, root module, alias-resolved edges, unresolved imports.
- Six damped, confidence-labelled scores with written explanations.

## Languages and parsers

TypeScript/JavaScript: real AST (compiler API). Python: structural indentation parser. Go, Rust, Java, C#, Ruby, PHP, C/C++, Swift, Kotlin: import-line scanning only. Everything else: counted, not parsed.

## What the AI layer actually does

Takes the analysis object the browser already holds, projects it into a compact brief (no file contents), calls a configured OpenAI-compatible endpoint, validates strict JSON, drops citations that do not match known findings or paths, and returns an explanation. It cannot scan, measure or change anything.

## Operational features

Live scan, offline demo, zero-issue reports, partial-analysis banners, coverage panel, issue filters, architecture graph, six scores, AI panel with disabled/loading/error states, rate limiting, body caps, same-origin checks.

## Incomplete features

Live AI provider call (no key); frontend component tests; streaming; conversation history; retrieval index; 14-section report outline (10 panels today); persistence/history/export; accessibility audit.

## Important architecture decisions

1. Engine is a pure function over an injected `GitHubClient` — no network inside analysis.
2. Budgets are adaptive but hard-capped; every scan reports what it did not read.
3. Only the TypeScript parser is called AST; everything else is labelled heuristic.
4. Evidence is minimal and redacted; secrets never enter findings or AI context.
5. AI is optional and fail-closed; the product works without any key.
6. Scores are versioned; damping is uniform; empty evidence returns neutral 50.

## Important file paths

```
src/lib/analysis/pipeline.ts        orchestration + coverage
src/lib/analysis/budgets.ts         adaptive limits
src/lib/analysis/parsers/           registry + language parsers
src/lib/analysis/graph.ts           nodes/edges/aliases/unresolved
src/lib/analysis/quality.ts         measured metrics
src/lib/analysis/security-rules.ts  credential + risk patterns
src/lib/analysis/scoring/           weights + sectors
src/lib/analysis/issues/detectors.ts findings
src/lib/ai/                         optional assistant
src/app/api/analyze/route.ts        scan API
src/app/api/ai/route.ts             assistant API
src/lib/mock/repo-analysis.ts       demo fixture (fictional)
docs/engineering/                   reports + status
```

## API contracts

- `POST /api/analyze` — `{ url, demo? }` → `{ ok: true, analysis: RepoAnalysis }` or `{ ok: false, error: { code, message } }`. Codes: `MALFORMED_URL`, `NOT_FOUND`, `RATE_LIMITED`, `UPSTREAM_ERROR`, `FORBIDDEN_ORIGIN`, `PAYLOAD_TOO_LARGE`, `MALFORMED_REQUEST`.
- `POST /api/ai` — `{ task, analysis, question?, issueId?, level? }` → `{ ok: true, answer, rejectedCitations }` or `{ ok: false, code, message }`; `503 AI_UNAVAILABLE` without a key.
- `GET` on either route → `405`.

## Data models

`RepoAnalysis { repo, analysis, score, structure, graph, issues, insights, system }`; `analysis` carries `engineVersion, scoringVersion, coverage?, budget?, ai, partial?, warnings?`; `Sector { id, label, score, explanation, confidence }`; `Issue` as in section 7.

## Analysis limitations

Sampling; estimated LOC outside the sample; root-manifest-only dependencies; structural Python; import-only other languages; block-similarity duplication; graph caps; no CVE/execution/coverage data.

## Known bugs

None known in the deterministic engine after this work. Outstanding risks: `postcss` advisory nested in Next; per-instance rate limiter; unauthenticated quota; unverified AI provider path.

## Outstanding tasks

Licence; shared rate limiter + token-backed quota; frontend tests; security headers; AI provider verification; accuracy corpus; performance/technical-debt panels.

## How to run

```bash
npm ci
npm run dev            # http://localhost:3210
npm run build && npm start
```

## How to test

```bash
npm test               # 87 tests, fixtures only
npm run typecheck
npm run lint
```

## External services

Optional `GITHUB_TOKEN` (quota) and optional AI credentials (`AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`). No paid service is required for the engine, and none was introduced.

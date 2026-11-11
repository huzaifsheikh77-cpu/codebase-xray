# 16 — Pre-Deployment Baseline

**Date:** 2026-11-05 · **Tree:** 52 modified/untracked files, uncommitted

## Executed on the unmodified Milestone 2 tree

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 19 files / 110 tests passed |
| `npm run benchmark` | 7 fixtures, TP 10 · FP 0 · FN 0, exit 0 |
| `npm run build` | Next 15.5.29, compiled in 3.7 s, exit 0 |
| `npm audit --omit=dev` | 2 vulnerabilities (1 high `postcss` via Next, 1 moderate) |

## Regression checks

- Monorepo alias regression test present (`graph.test.ts`, top-level modules + workspaces).
- Critical-path coverage and capability disclosure present (`critical.ts`, `capabilities.ts`, `/08`).
- AI grounding contract present (`validate.ts`, `service.test.ts`).
- Security headers present in `next.config.ts`.

## Environment findings (deployment-relevant)

| Item | Result |
|---|---|
| Node / npm | v24.21.0 / 11.19.0 |
| Vercel CLI | **not installed** (`vercel: command not found`) |
| Vercel authentication | **none** |
| `VERCEL*`, `UPSTASH*`, `KV_REST*`, `GITHUB_TOKEN`, `AI_API_KEY` env vars | **none set** |
| `.env` file | absent; only `.env.example` |
| Git remote work | none performed this milestone |

**Consequence:** deployment cannot be executed from this machine. Workstream G is reported as *prepared, not deployed*; the exact owner actions are in Reports 23 and 25.

## Fresh live analysis (development config, before deployment work)

`sindresorhus/p-map` at the default branch, `xray.engine v3.0.0`:

| Measure | Value |
|---|---|
| Eligible / inspected | 14 / 14 (100%) |
| Parsed | 7 (full-depth JS/TS) |
| Graph | 9 nodes, 5 edges, 0 unresolved |
| Issues | 10 |
| Critical paths | entry 1/1 |
| GitHub quota after | 38/60 |
| Duration | 1,642 ms |

This is a local production build (`next start`), not a deployed-environment test.

## Post-change gate

| Command | Result |
|---|---|
| typecheck / lint | 0 / 0 |
| tests | 20 files / 120 tests |
| benchmark | pass |
| build | pass (6.0 s) |

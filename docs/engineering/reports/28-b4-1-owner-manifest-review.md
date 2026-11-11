# 28-B4.1 — Owner Manifest Review

**Status:** Independent, read-only review of the B4 manifest as frozen at review time. The manifest was not edited during that review. This report was outside the 154-row manifest when written; B4.2 added it to B4-09 as path 155.
**Repository:** `D:\CODEBASEXRAY`
**Branch / HEAD:** `master` / `e287e079b2ab086e5339192dd1bd86c1c48192cf`
**Review date:** 2026-11-07
**Live status at review:** 42 modified, 1 deleted, 111 untracked, 154 total; staged 0; `git diff --stat` 43 files, +3,199/−1,205. After this report was created the status became 42 modified, 1 deleted, 112 untracked, 155 total. B4.2 added it to the manifest and created a separate corrections report, so the current status is 42/1/113/156; the 155-row manifest excludes the B4.2 report.
**Manifest result at review:** 154 rows; 133 INCLUDE, 21 DEPENDENCY, 0 HOLD, 0 EXCLUDE. B4.2 final: 155 rows; 134 INCLUDE, 21 DEPENDENCY.
**Recommendation:** **B — approve after the four file-level corrections in §9.**

**B4.2 addendum (2026-11-07):** Findings 1–4 in §9 were addressed in `28-b4-2-final-manifest-corrections.md`. The manifest now contains 155 paths (134 INCLUDE, 21 DEPENDENCY), this review is path 155 in B4-09, the benchmark files are labelled historical, `.env.example` is clean, and the manifest provenance labels are corrected. The 154-row inventory below is the review-time record.

## 1. Method and scope

The starting point was the actual manifest, not the B4 report summary. All 154 table rows were parsed and compared with `git status --porcelain=v1 -uall`. The live status matches the manifest exactly: 42 modified, 1 deleted, 111 untracked. No path is duplicated and no manifest row is absent from the working tree.

The import check parsed 119 TypeScript/TSX files with the TypeScript AST and resolved **318 local import edges**. Seven apparent unresolved strings in `graph.test.ts` and `sectors.test.ts` are fixture content such as `@/util`, `./missing` and `./index.js`; they are not module imports. No real local import is missing.

This review did not read `.env.local`, did not print credentials, and did not stage, commit, push, merge, deploy, reset, clean, stash or delete project content. One review-integrity incident is disclosed in §6: a benchmark probe temporarily rewrote two generated benchmark artifacts; the original 2026-11-05 timestamp/content was restored. That restoration is the only project write other than this report.

## 2. Complete 154-row inventory

The columns are:

- **Pre-B1** — whether the path existed in `HEAD` before B1. Every `M`/`D` path did; every `??` path did not.
- **Changed by** — best-known batch history from the manifest plus the B2.1, B3 and B4 change lists. It is not a substitute for a per-commit history. Where the manifest’s broad label was not supported by the B3 change list, the table records the evidenced batch and §3 identifies the metadata discrepancy.
- **Direct dependencies** — direct local imports resolved from source, external package names for code, and documentary references for reports. This is intentionally not a transitive graph.

| # | Exact path | Class | Commit group | Purpose | Pre-B1 | Changed by | Direct dependencies | Type |
|---:|---|---|---|---|---|---|---|---|
| 1 | `.env.example` | **INCLUDE** | B4-01 foundation/config | Environment variable contract; names/defaults only | yes | B1, B2 | deployment environment names only | configuration |
| 2 | `.github/workflows/ci.yml` | **INCLUDE** | B4-08 CI/benchmarks | CI gates: lint, typecheck, tests, benchmark, build, Chromium, Playwright, failure artifacts | no | B1, B3 | package scripts; Vitest; Playwright | CI configuration |
| 3 | `.gitignore` | **INCLUDE** | B4-01 foundation/config | Ignore local transcripts, env files, generated build/browser output | yes | B1, B2, B2.1 | none | configuration |
| 4 | `.vercelignore` | **INCLUDE** | B4-01 foundation/config | Exclude docs, benchmarks, CI and local transcripts from deployment upload | no | B1 | none | configuration |
| 5 | `README.md` | **INCLUDE** | B4-09 documentation | Product scope, setup, security behavior and limitations; B4 fixes request-flow and shared-store wording | yes | B1, B2, B3, B4 | reports 25/27/28; no runtime | documentation |
| 6 | `benchmarks/accuracy.test.ts` | **INCLUDE** | B4-08 CI/benchmarks | Accuracy/performance fixture or benchmark runner | no | B1, B3 | benchmarks/cases.ts; benchmarks/runner.ts; src/lib/analysis/pipeline.ts | test |
| 7 | `benchmarks/b3-performance.test.ts` | **INCLUDE** | B4-08 CI/benchmarks | B3 deterministic performance harness | no | B3 | src/lib/analysis/pipeline.ts; src/lib/github/client.ts; src/lib/github/endpoints.ts | test |
| 8 | `benchmarks/cases.ts` | **INCLUDE** | B4-08 CI/benchmarks | Accuracy/performance fixture or benchmark runner | no | B1 | fixtures; analysis pipeline | test support |
| 9 | `benchmarks/runner.ts` | **INCLUDE** | B4-08 CI/benchmarks | Accuracy/performance fixture or benchmark runner | no | B1 | benchmarks/cases.ts; src/lib/analysis/pipeline.ts; src/lib/github/client.ts; src/lib/github/endpoints.ts; src/lib/types/analysis.ts | test support |
| 10 | `docs/engineering/ARCHITECTURE.md` | **INCLUDE** | B4-09 documentation | Living engineering, operations or limitation documentation | no | B1, B2, B3 | documentation only; no runtime | documentation |
| 11 | `docs/engineering/CODEBASE_XRAY_FINAL_ENGINEERING_REPORT.md` | **INCLUDE** | B4-09 documentation | Living engineering, operations or limitation documentation | no | B1, B2, B3 | documentation only; no runtime | documentation |
| 12 | `docs/engineering/CODEBASE_XRAY_MASTER_STATUS.md` | **INCLUDE** | B4-09 documentation | Living engineering, operations or limitation documentation | no | B1, B2, B3, B4 | documentation only; no runtime | documentation |
| 13 | `docs/engineering/CODEBASE_XRAY_MILESTONE_2_REPORT.md` | **INCLUDE** | B4-09 documentation | Living engineering, operations or limitation documentation | no | B1, B2, B3 | documentation only; no runtime | documentation |
| 14 | `docs/engineering/CODEBASE_XRAY_MILESTONE_3_REPORT.md` | **INCLUDE** | B4-09 documentation | Living engineering, operations or limitation documentation | no | B1, B2, B3 | documentation only; no runtime | documentation |
| 15 | `docs/engineering/KNOWN_LIMITATIONS.md` | **INCLUDE** | B4-09 documentation | Living engineering, operations or limitation documentation | no | B1, B3 | documentation only; no runtime | documentation |
| 16 | `docs/engineering/PUBLIC_BETA_CHECKLIST.md` | **INCLUDE** | B4-09 documentation | Living engineering, operations or limitation documentation | no | B1, B2, B2.1, B3, B4 | documentation only; no runtime | documentation |
| 17 | `docs/engineering/ai-evaluation.md` | **INCLUDE** | B4-09 documentation | Living engineering, operations or limitation documentation | no | B1, B2, B3 | documentation only; no runtime | documentation |
| 18 | `docs/engineering/benchmarks/README.md` | **INCLUDE** | B4-09 documentation | Accuracy benchmark record | no | B1 | benchmarks/accuracy.test.ts | documentation |
| 19 | `docs/engineering/benchmarks/latest.json` | **INCLUDE** | B4-09 documentation | Accuracy benchmark record | no | B1 | generated by benchmarks/accuracy.test.ts | generated evidence |
| 20 | `docs/engineering/benchmarks/latest.md` | **INCLUDE** | B4-09 documentation | Accuracy benchmark record | no | B1 | generated by benchmarks/accuracy.test.ts | generated evidence |
| 21 | `docs/engineering/reports/00-initial-baseline.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 22 | `docs/engineering/reports/01-stabilisation-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 23 | `docs/engineering/reports/02-core-analysis-engine-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 24 | `docs/engineering/reports/03-evidence-scoring-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 25 | `docs/engineering/reports/04-ai-intelligence-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 26 | `docs/engineering/reports/05-quality-security-production-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 27 | `docs/engineering/reports/06-current-state-verification-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 28 | `docs/engineering/reports/07-analysis-accuracy-benchmark-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 29 | `docs/engineering/reports/08-language-capability-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 30 | `docs/engineering/reports/09-adaptive-scanning-validation-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 31 | `docs/engineering/reports/10-ai-intelligence-validation-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 32 | `docs/engineering/reports/11-frontend-quality-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 33 | `docs/engineering/reports/12-security-and-production-readiness-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 34 | `docs/engineering/reports/13-performance-and-scalability-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 35 | `docs/engineering/reports/14-report-and-scoring-completeness-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 36 | `docs/engineering/reports/15-testing-and-ci-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 37 | `docs/engineering/reports/16-pre-deployment-baseline.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 38 | `docs/engineering/reports/17-vercel-deployment-architecture-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 39 | `docs/engineering/reports/18-shared-rate-limiting-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 40 | `docs/engineering/reports/19-github-api-protection-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 41 | `docs/engineering/reports/20-public-beta-security-audit.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 42 | `docs/engineering/reports/21-ai-public-beta-readiness.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 43 | `docs/engineering/reports/22-public-beta-ux-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 44 | `docs/engineering/reports/23-vercel-deployment-execution-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 45 | `docs/engineering/reports/24-live-production-verification-report.md` | **INCLUDE** | B4-09 documentation | Historical engineering report | no | B1, B2 | historical docs; no runtime | documentation |
| 46 | `docs/engineering/reports/25-b2-independent-verification-report.md` | **INCLUDE** | B4-09 documentation | B2 verification/checklist/cost record | no | B2 | historical docs; no runtime | documentation |
| 47 | `docs/engineering/reports/25-b2-owner-release-checklist.md` | **INCLUDE** | B4-09 documentation | B2 verification/checklist/cost record | no | B2 | historical docs; no runtime | documentation |
| 48 | `docs/engineering/reports/25-public-beta-cost-and-operations-report.md` | **INCLUDE** | B4-09 documentation | Historical cost report with dated 8/min correction; original 40/min text preserved | no | B1, B3 | historical docs; no runtime | documentation |
| 49 | `docs/engineering/reports/26-b2-1-release-candidate-audit.md` | **INCLUDE** | B4-09 documentation | B2.1 release audit/manifest | no | B2.1 | historical docs; no runtime | documentation |
| 50 | `docs/engineering/reports/26-b2-1-release-candidate-manifest.md` | **INCLUDE** | B4-09 documentation | B2.1 release audit/manifest | no | B2.1 | historical docs; no runtime | documentation |
| 51 | `docs/engineering/reports/27-b3-autonomous-execution-report.md` | **INCLUDE** | B4-09 documentation | B3 engineering evidence/report | no | B3 | historical docs; no runtime | documentation |
| 52 | `docs/engineering/reports/27-b3-owner-action-checklist.md` | **INCLUDE** | B4-09 documentation | B3 engineering evidence/report | no | B3 | historical docs; no runtime | documentation |
| 53 | `docs/engineering/reports/27-b3-performance-results.md` | **INCLUDE** | B4-09 documentation | B3 engineering evidence/report | no | B3 | historical docs; no runtime | documentation |
| 54 | `docs/engineering/reports/27-b3-private-beta-operations-runbook.md` | **INCLUDE** | B4-09 documentation | B3 engineering evidence/report | no | B3 | historical docs; no runtime | documentation |
| 55 | `docs/engineering/reports/27-b3-security-verification.md` | **INCLUDE** | B4-09 documentation | B3 engineering evidence/report | no | B3 | historical docs; no runtime | documentation |
| 56 | `docs/engineering/reports/28-b4-controlled-release-report.md` | **INCLUDE** | B4-09 documentation | B4 controlled release report and approval package | no | B4 | manifest 28; B4 evidence | documentation |
| 57 | `docs/engineering/reports/28-b4-release-candidate-manifest.md` | **INCLUDE** | B4-09 documentation | B4 complete candidate inventory and commit-group assignment | no | B4 | all 154 candidate paths | documentation |
| 58 | `docs/engineering/reports/b2-evidence/b2-demo-desktop.png` | **INCLUDE** | B4-09 documentation | B2 visual evidence | no | B2 | historical screenshots; no runtime | evidence image |
| 59 | `docs/engineering/reports/b2-evidence/b2-demo-mobile.png` | **INCLUDE** | B4-09 documentation | B2 visual evidence | no | B2 | historical screenshots; no runtime | evidence image |
| 60 | `docs/engineering/reports/b2-evidence/b2-live-desktop.png` | **INCLUDE** | B4-09 documentation | B2 visual evidence | no | B2 | historical screenshots; no runtime | evidence image |
| 61 | `e2e/b2-public-beta.spec.ts` | **INCLUDE** | B4-07 browser harness | Playwright browser journeys; live GitHub case gated | no | B2, B3 | @playwright/test | test |
| 62 | `next.config.ts` | **DEPENDENCY** | B4-01 foundation/config | Security headers and externalized TypeScript runtime | yes | B1 | next; security headers | configuration |
| 63 | `package-lock.json` | **DEPENDENCY** | B4-01 foundation/config | Locked dependency graph including Playwright and axe | yes | B1, B3 | package.json | configuration |
| 64 | `package.json` | **INCLUDE** | B4-01 foundation/config | Dependency and script metadata; axe direct dev dependency | yes | B1, B3 | none | configuration |
| 65 | `playwright.config.ts` | **DEPENDENCY** | B4-07 browser harness | Playwright local dev-server and browser configuration | no | B2 | @playwright/test; e2e | configuration |
| 66 | `src/app/api/ai/route.test.ts` | **INCLUDE** | B4-04 AI boundary | AI route gate and oversized-body regressions | no | B1, B2, B2.1 | src/app/api/ai/route.ts; npm:vitest | test |
| 67 | `src/app/api/ai/route.ts` | **INCLUDE** | B4-04 AI boundary | AI route; origin, hosted opt-in, schema, token, quota and provider gates | no | B1, B2, B2.1 | src/lib/ai/analysis-token.ts; src/lib/ai/config.ts; src/lib/ai/request-schema.ts; src/lib/ai/service.ts; src/lib/ai/types.ts; src/lib/server/observability.ts; src/lib/server/rate-limit.ts; src/lib/server/request-guards.ts; npm:next/server | source |
| 68 | `src/app/api/analyze/route.test.ts` | **INCLUDE** | B4-05 analyze API | Analyze route regressions: malformed/oversized input, quota ordering, origin, rate limit | yes | B1, B3 | src/app/api/analyze/route.ts; src/lib/server/rate-limit.ts; npm:vitest | test |
| 69 | `src/app/api/analyze/route.ts` | **INCLUDE** | B4-05 analyze API | Analyze route; validates URL/config before quota, rejects private repos before retrieval, discloses partial results | yes | B1, B3 | src/lib/ai/analysis-token.ts; src/lib/analysis/pipeline.ts; src/lib/config/env.ts; src/lib/github/admission.ts; src/lib/github/client.ts; src/lib/github/parse-url.ts; src/lib/mock/repo-analysis.ts; src/lib/server/observability.ts; src/lib/server/rate-limit.ts; src/lib/server/request-guards.ts; src/lib/types/analysis.ts; npm:next/server | source |
| 70 | `src/app/globals.css` | **INCLUDE** | B4-06 report UI | Design tokens and contrast styles | yes | B1, B3 | none | source style |
| 71 | `src/app/page.tsx` | **INCLUDE** | B4-06 report UI | Application entry page | yes | B1 | src/components/public-beta-notice.tsx; src/components/xray-experience.tsx | source |
| 72 | `src/components/ai/assistant-panel.test.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | no | B1 | src/components/ai/assistant-panel.tsx; src/lib/mock/repo-analysis.ts; src/lib/types/analysis.ts; npm:@testing-library/react; npm:vitest | test |
| 73 | `src/components/ai/assistant-panel.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | no | B1 | src/components/ui/demo-badge.tsx; src/components/ui/panel.tsx; src/components/ui/section-shell.tsx; src/lib/ai/types.ts; src/lib/types/analysis.ts; npm:lucide-react; npm:react | source |
| 74 | `src/components/analysis/analysis-summary.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | yes | B1, B3 | src/components/ui/demo-badge.tsx; src/components/ui/meter.tsx; src/components/ui/panel.tsx; src/components/ui/section-shell.tsx; src/lib/types/analysis.ts; src/lib/utils/format.ts; npm:react | source |
| 75 | `src/components/hero/repo-form.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | yes | B1 | src/components/ui/action-button.tsx; src/lib/github/parse-url.ts; npm:lucide-react; npm:react | source |
| 76 | `src/components/hero/scan-hero.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | yes | B1 | src/components/hero/repo-form.tsx; src/components/hero/scan-overlay.tsx; src/components/ui/mono-label.tsx; src/lib/types/analysis.ts; src/lib/version.ts | source |
| 77 | `src/components/hero/scan-overlay.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | yes | B1 | src/lib/types/analysis.ts; src/lib/utils/format.ts; npm:react | source |
| 78 | `src/components/insights/insights-section.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | yes | B1 | src/components/ui/demo-badge.tsx; src/components/ui/section-shell.tsx; src/lib/types/analysis.ts; npm:lucide-react | source |
| 79 | `src/components/issues/issues-section.test.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | no | B1 | src/components/issues/issues-section.tsx; src/lib/mock/repo-analysis.ts; npm:@testing-library/react; npm:vitest | test |
| 80 | `src/components/issues/issues-section.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | yes | B1 | src/components/ui/demo-badge.tsx; src/components/ui/empty-state.tsx; src/components/ui/panel.tsx; src/components/ui/section-shell.tsx; src/components/ui/severity-chip.tsx; src/lib/types/analysis.ts; src/lib/utils/format.ts; npm:lucide-react; npm:react | source |
| 81 | `src/components/presentation-layer.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | yes | B1 | src/components/ai/assistant-panel.tsx; src/components/analysis/analysis-summary.tsx; src/components/insights/insights-section.tsx; src/components/issues/issues-section.tsx; src/components/structure/repo-structure.tsx; src/components/system/coverage-section.tsx; src/components/system/system-status.tsx; src/components/ui/demo-badge.tsx; src/components/ui/mono-label.tsx; src/components/visualization/codebase-map.tsx; src/lib/types/analysis.ts; src/lib/utils/format.ts | source |
| 82 | `src/components/public-beta-notice.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | no | B1 | none | source |
| 83 | `src/components/system/coverage-section.test.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | no | B1 | src/components/system/coverage-section.tsx; src/lib/mock/repo-analysis.ts; src/lib/types/analysis.ts; npm:@testing-library/react; npm:vitest | test |
| 84 | `src/components/system/coverage-section.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | no | B1 | src/components/ui/demo-badge.tsx; src/components/ui/panel.tsx; src/components/ui/section-shell.tsx; src/lib/types/analysis.ts; src/lib/utils/format.ts | source |
| 85 | `src/components/ui/empty-state.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | yes | B1 | npm:lucide-react | source |
| 86 | `src/components/ui/meter.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | yes | B1, B3 | npm:react | source |
| 87 | `src/components/ui/score-pill.tsx` | **INCLUDE** | B4-10 deletion | Accepted deletion of unused standalone score component | yes | B3 (deletion) | none; no importers | source (deleted) |
| 88 | `src/components/ui/severity-chip.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | yes | B1, B3 | src/lib/types/analysis.ts | source |
| 89 | `src/components/xray-experience.tsx` | **INCLUDE** | B4-06 report UI | Report UI, accessibility states or component tests | yes | B1 | src/components/hero/scan-hero.tsx; src/components/layout/site-footer.tsx; src/components/navigation/section-nav.tsx; src/components/navigation/top-bar.tsx; src/components/presentation-layer.tsx; src/components/ui/demo-badge.tsx; src/components/ui/error-state.tsx; src/lib/mock/repo-analysis.ts; src/lib/mock/scan-stages.ts; src/lib/types/analysis.ts; npm:react | source |
| 90 | `src/lib/ai/analysis-token.test.ts` | **INCLUDE** | B4-04 AI boundary | AI schema, provider, prompt, context, service or test | no | B1 | src/lib/ai/analysis-token.ts; src/lib/mock/repo-analysis.ts; npm:vitest | test |
| 91 | `src/lib/ai/analysis-token.ts` | **DEPENDENCY** | B4-01 foundation/config | Expiring HMAC analysis-to-AI binding | no | B1 | src/lib/types/analysis.ts; npm:node:crypto | source |
| 92 | `src/lib/ai/config.test.ts` | **INCLUDE** | B4-04 AI boundary | B4 tests for AI public availability gates | no | B4 | src/lib/ai/config.ts; npm:vitest | test |
| 93 | `src/lib/ai/config.ts` | **DEPENDENCY** | B4-01 foundation/config | AI configuration; B4 makes public status mirror emergency, hosted opt-in and production-secret gates | no | B1, B4 | src/lib/types/analysis.ts | configuration |
| 94 | `src/lib/ai/context.ts` | **INCLUDE** | B4-04 AI boundary | AI schema, provider, prompt, context, service or test | no | B1 | src/lib/ai/types.ts; src/lib/types/analysis.ts | source |
| 95 | `src/lib/ai/prompt-injection.test.ts` | **INCLUDE** | B4-04 AI boundary | AI schema, provider, prompt, context, service or test | no | B1 | src/lib/ai/config.ts; src/lib/ai/context.ts; src/lib/ai/prompts.ts; src/lib/ai/provider.ts; src/lib/ai/service.ts; src/lib/ai/validate.ts; src/lib/mock/repo-analysis.ts; npm:vitest | test |
| 96 | `src/lib/ai/prompts.ts` | **INCLUDE** | B4-04 AI boundary | AI schema, provider, prompt, context, service or test | no | B1 | src/lib/ai/context.ts; src/lib/ai/types.ts | source |
| 97 | `src/lib/ai/provider.ts` | **INCLUDE** | B4-04 AI boundary | AI schema, provider, prompt, context, service or test | no | B1 | src/lib/ai/config.ts | source |
| 98 | `src/lib/ai/request-schema.test.ts` | **INCLUDE** | B4-04 AI boundary | AI schema, provider, prompt, context, service or test | no | B1 | src/lib/ai/request-schema.ts; src/lib/mock/repo-analysis.ts; npm:vitest | test |
| 99 | `src/lib/ai/request-schema.ts` | **INCLUDE** | B4-04 AI boundary | AI schema, provider, prompt, context, service or test | no | B1 | src/lib/types/analysis.ts | source |
| 100 | `src/lib/ai/service.test.ts` | **INCLUDE** | B4-04 AI boundary | AI schema, provider, prompt, context, service or test | no | B1 | src/lib/ai/config.ts; src/lib/ai/provider.ts; src/lib/ai/service.ts; src/lib/ai/types.ts; src/lib/mock/repo-analysis.ts; npm:vitest | test |
| 101 | `src/lib/ai/service.ts` | **INCLUDE** | B4-04 AI boundary | AI schema, provider, prompt, context, service or test | no | B1 | src/lib/ai/config.ts; src/lib/ai/context.ts; src/lib/ai/prompts.ts; src/lib/ai/provider.ts; src/lib/ai/request-schema.ts; src/lib/ai/types.ts; src/lib/ai/validate.ts; src/lib/types/analysis.ts | source |
| 102 | `src/lib/ai/types.ts` | **DEPENDENCY** | B4-01 foundation/config | Shared AI request/status types | no | B1 | src/lib/types/analysis.ts | source |
| 103 | `src/lib/ai/validate.test.ts` | **INCLUDE** | B4-04 AI boundary | AI schema, provider, prompt, context, service or test | no | B1 | src/lib/ai/types.ts; src/lib/ai/validate.ts; npm:vitest | test |
| 104 | `src/lib/ai/validate.ts` | **INCLUDE** | B4-04 AI boundary | AI schema, provider, prompt, context, service or test | no | B1 | src/lib/ai/types.ts | source |
| 105 | `src/lib/analysis/architecture-profile.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/context.ts; src/lib/analysis/extractors/architecture.ts; src/lib/types/analysis.ts | source |
| 106 | `src/lib/analysis/budgets.test.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/budgets.ts; npm:vitest | test |
| 107 | `src/lib/analysis/budgets.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/limits.ts; src/lib/types/analysis.ts | source |
| 108 | `src/lib/analysis/capabilities.test.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/capabilities.ts; src/lib/analysis/parsers/registry.ts; npm:vitest | test |
| 109 | `src/lib/analysis/capabilities.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/parsers/registry.ts | source |
| 110 | `src/lib/analysis/critical.test.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/critical.ts; npm:vitest | test |
| 111 | `src/lib/analysis/critical.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | none | source |
| 112 | `src/lib/analysis/graph.test.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/context.ts; src/lib/analysis/graph.ts; src/lib/analysis/parsers/registry.ts; src/lib/github/endpoints.ts; npm:vitest | test |
| 113 | `src/lib/analysis/graph.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | yes | B1 | src/lib/analysis/context.ts; src/lib/analysis/parsers/types.ts; src/lib/analysis/tree-utils.ts | source |
| 114 | `src/lib/analysis/insights.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | yes | B1 | src/lib/analysis/issues/detectors.ts; src/lib/types/analysis.ts; src/lib/utils/format.ts | source |
| 115 | `src/lib/analysis/issues/detectors.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | yes | B1 | src/lib/analysis/architecture-profile.ts; src/lib/analysis/context.ts; src/lib/analysis/extractors/architecture.ts; src/lib/analysis/extractors/dependencies.ts; src/lib/analysis/extractors/docs.ts; src/lib/analysis/extractors/security.ts; src/lib/analysis/extractors/stats.ts; src/lib/analysis/extractors/testing.ts; src/lib/analysis/quality.ts; src/lib/analysis/security-rules.ts; src/lib/types/analysis.ts; src/lib/utils/format.ts | source |
| 116 | `src/lib/analysis/limits.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | yes | B1 | none | source |
| 117 | `src/lib/analysis/parsers/common.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/parsers/types.ts | source |
| 118 | `src/lib/analysis/parsers/generic-parser.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/parsers/common.ts; src/lib/analysis/parsers/types.ts | source |
| 119 | `src/lib/analysis/parsers/python-parser.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/parsers/common.ts; src/lib/analysis/parsers/types.ts | source |
| 120 | `src/lib/analysis/parsers/registry.test.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/parsers/python-parser.ts; src/lib/analysis/parsers/registry.ts; src/lib/analysis/parsers/typescript-parser.ts; npm:vitest | test |
| 121 | `src/lib/analysis/parsers/registry.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/parsers/common.ts; src/lib/analysis/parsers/generic-parser.ts; src/lib/analysis/parsers/python-parser.ts; src/lib/analysis/parsers/types.ts; src/lib/analysis/parsers/typescript-parser.ts | source |
| 122 | `src/lib/analysis/parsers/types.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | none | source |
| 123 | `src/lib/analysis/parsers/typescript-parser.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/parsers/common.ts; src/lib/analysis/parsers/types.ts; npm:typescript | source |
| 124 | `src/lib/analysis/pipeline-private.test.ts` | **INCLUDE** | B4-02 analysis engine | Private/malformed metadata rejection before tree/blob access | no | B1 | src/lib/analysis/pipeline.ts; src/lib/github/client.ts; src/lib/github/endpoints.ts; npm:vitest | test |
| 125 | `src/lib/analysis/pipeline-reliability.test.ts` | **INCLUDE** | B4-02 analysis engine | B3 controlled partial-result tests for failed blobs and malformed source | no | B3 | src/lib/analysis/pipeline.ts; src/lib/github/client.ts; src/lib/github/endpoints.ts; npm:vitest | test |
| 126 | `src/lib/analysis/pipeline.test.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | yes | B1 | src/lib/analysis/budgets.ts; src/lib/analysis/pipeline.ts; src/lib/github/client.ts; src/lib/github/endpoints.ts; npm:vitest | test |
| 127 | `src/lib/analysis/pipeline.ts` | **DEPENDENCY** | B4-02 analysis engine | Deterministic analysis pipeline and private-repository confidentiality boundary | yes | B1 | src/lib/ai/analysis-token.ts; src/lib/ai/config.ts; src/lib/analysis/architecture-profile.ts; src/lib/analysis/budgets.ts; src/lib/analysis/capabilities.ts; src/lib/analysis/context.ts; src/lib/analysis/critical.ts; src/lib/analysis/extractors/architecture.ts; src/lib/analysis/extractors/dependencies.ts; src/lib/analysis/extractors/docs.ts; src/lib/analysis/extractors/security.ts; src/lib/analysis/extractors/stats.ts; src/lib/analysis/extractors/testing.ts; src/lib/analysis/graph.ts; src/lib/analysis/insights.ts; src/lib/analysis/issues/detectors.ts; src/lib/analysis/languages.ts; src/lib/analysis/limits.ts; src/lib/analysis/parsers/registry.ts; src/lib/analysis/quality.ts; src/lib/analysis/scoring/overall.ts; src/lib/analysis/scoring/sectors.ts; src/lib/analysis/scoring/weights.ts; src/lib/analysis/security-rules.ts; src/lib/analysis/status.ts; src/lib/analysis/tree-utils.ts; src/lib/github/client.ts; src/lib/github/endpoints.ts; src/lib/types/analysis.ts; src/lib/version.ts | source |
| 128 | `src/lib/analysis/quality.test.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/parsers/registry.ts; src/lib/analysis/quality.ts; npm:vitest | test |
| 129 | `src/lib/analysis/quality.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/parsers/types.ts | source |
| 130 | `src/lib/analysis/scoring/sectors.test.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | yes | B1 | src/lib/analysis/context.ts; src/lib/analysis/extractors/architecture.ts; src/lib/analysis/extractors/dependencies.ts; src/lib/analysis/extractors/docs.ts; src/lib/analysis/extractors/security.ts; src/lib/analysis/extractors/stats.ts; src/lib/analysis/extractors/testing.ts; src/lib/analysis/scoring/overall.ts; src/lib/analysis/scoring/sectors.ts; src/lib/github/endpoints.ts; npm:vitest | test |
| 131 | `src/lib/analysis/scoring/sectors.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | yes | B1 | src/lib/analysis/issues/detectors.ts; src/lib/analysis/scoring/overall.ts; src/lib/analysis/scoring/weights.ts; src/lib/types/analysis.ts; src/lib/utils/format.ts | source |
| 132 | `src/lib/analysis/scoring/weights.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | yes | B1 | none | source |
| 133 | `src/lib/analysis/security-rules.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | no | B1 | src/lib/analysis/context.ts; src/lib/analysis/parsers/common.ts; src/lib/types/analysis.ts | source |
| 134 | `src/lib/analysis/status.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | yes | B1 | src/lib/github/client.ts; src/lib/types/analysis.ts | source |
| 135 | `src/lib/analysis/tree-utils.test.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | yes | B1 | src/lib/analysis/tree-utils.ts; npm:vitest | test |
| 136 | `src/lib/analysis/tree-utils.ts` | **INCLUDE** | B4-02 analysis engine | Analysis engine, parser, graph, scoring, detector or tests | yes | B1 | src/lib/analysis/critical.ts; src/lib/analysis/languages.ts; src/lib/analysis/limits.ts; src/lib/github/endpoints.ts | source |
| 137 | `src/lib/config/env.ts` | **DEPENDENCY** | B4-01 foundation/config | Server-only environment access and production gates | yes | B1 | none | source |
| 138 | `src/lib/github/admission.test.ts` | **INCLUDE** | B4-03 GitHub/server controls | GitHub client, URL parser, admission or tests | no | B1 | src/lib/github/admission.ts; npm:vitest | test |
| 139 | `src/lib/github/admission.ts` | **DEPENDENCY** | B4-03 GitHub/server controls | Conservative GitHub request-cost admission and safety reserve | no | B1 | src/lib/analysis/budgets.ts; src/lib/github/endpoints.ts | source |
| 140 | `src/lib/github/client.ts` | **DEPENDENCY** | B4-03 GitHub/server controls | Bounded GitHub REST client, ETag cache and error classification | yes | B1 | src/lib/config/env.ts; src/lib/github/endpoints.ts; src/lib/types/analysis.ts | source |
| 141 | `src/lib/mock/repo-analysis.ts` | **DEPENDENCY** | B4-02 analysis engine | Deterministic demo fixture | yes | B1 | src/lib/types/analysis.ts | source |
| 142 | `src/lib/mock/scan-stages.ts` | **DEPENDENCY** | B4-02 analysis engine | Deterministic demo fixture | yes | B1 | src/lib/types/analysis.ts | source |
| 143 | `src/lib/server/observability.ts` | **DEPENDENCY** | B4-03 GitHub/server controls | Safe request IDs and structured logs; no secrets or source | no | B3 | npm:node:crypto | source |
| 144 | `src/lib/server/quota-store.test.ts` | **INCLUDE** | B4-03 GitHub/server controls | Shared quota, request guard, observability or tests | no | B1 | src/lib/server/quota-store.ts; src/lib/server/rate-limit.ts; npm:vitest | test |
| 145 | `src/lib/server/quota-store.ts` | **DEPENDENCY** | B4-03 GitHub/server controls | Redis REST/Lua adapter and in-memory fallback | no | B1 | none | source |
| 146 | `src/lib/server/rate-limit.test.ts` | **INCLUDE** | B4-03 GitHub/server controls | Shared quota, request guard, observability or tests | yes | B1, B3 | src/lib/server/rate-limit.ts; npm:vitest | test |
| 147 | `src/lib/server/rate-limit.ts` | **DEPENDENCY** | B4-03 GitHub/server controls | Atomic per-client/global quota, hourly budget, scan lock; production fails closed | yes | B1, B2.1 | src/lib/server/quota-store.ts; npm:node:crypto | source |
| 148 | `src/lib/server/request-guards.test.ts` | **INCLUDE** | B4-03 GitHub/server controls | Shared quota, request guard, observability or tests | no | B1, B3 | src/lib/server/request-guards.ts; npm:vitest | test |
| 149 | `src/lib/server/request-guards.ts` | **DEPENDENCY** | B4-03 GitHub/server controls | Same-origin and streamed body-size guards | no | B1, B2 | none | source |
| 150 | `src/lib/types/analysis.ts` | **DEPENDENCY** | B4-01 foundation/config | Shared TypeScript contracts | yes | B1 | none | source |
| 151 | `src/lib/utils/format.ts` | **DEPENDENCY** | B4-01 foundation/config | Formatting helpers including accessible band text colors | yes | B1, B3 | src/lib/types/analysis.ts | source |
| 152 | `src/lib/version.ts` | **DEPENDENCY** | B4-01 foundation/config | Engine version constant | no | B1 | none | source |
| 153 | `vitest.benchmark.config.ts` | **DEPENDENCY** | B4-01 foundation/config | Vitest/benchmark test runner configuration | no | B1 | vitest; test suite | configuration |
| 154 | `vitest.config.ts` | **DEPENDENCY** | B4-01 foundation/config | Vitest/benchmark test runner configuration | yes | B1 | vitest; test suite | configuration |

## 3. Classification and history discrepancies

### 3.1 The 154 release decisions hold

- **133 INCLUDE** and **21 DEPENDENCY** paths account for all 154 rows.
- **No HOLD** and **no EXCLUDE** row is present in the frozen table.
- Every `DEPENDENCY` has a direct consumer in an included source, test, configuration or benchmark path. I found no DEPENDENCY that is actually unrelated to the candidate.
- Every INCLUDE is source, test, configuration, documentation or intentional generated evidence. None is an environment file, transcript, browser trace, build output or unrelated personal file.
- `.cloud-attachments/`, `.env.local`, `.next/`, `test-results/`, `playwright-report/`, `node_modules/`, `.vercel/` and `.freebuff/` are excluded correctly.

### 3.2 Generated evidence needs a freshness decision

`docs/engineering/benchmarks/latest.json` and `latest.md` are generated by `benchmarks/accuracy.test.ts`. Their recorded run is **2026-11-05T08:37:57.303Z**. They are valid historical evidence, but the `latest` filename is misleading for a 2026-11-07 candidate unless the owner treats them as a snapshot. This is not a reason to exclude the engine or tests; it is a release-record correction.

The B2 screenshots in `docs/engineering/reports/b2-evidence/` are also generated evidence, but they are explicitly historical and are safe to retain as documentation assets.

### 3.3 The B4.1 report was outside the frozen manifest at review time

At B4.1 time this report was a new path created after the 154-row manifest. It was not in any B4 commit group and was not a runtime dependency. B4.2 resolved this by adding it to B4-09 and expanding the release set to 155 paths (134 INCLUDE, 21 DEPENDENCY).

### 3.4 Batch-history labels are incomplete

The following rows have known history that the manifest’s `Origin` label does not fully express:

| Path | Manifest origin | Evidenced history |
|---|---|---|
| `.gitignore` | B1/B2 | B1, B2, **B2.1** |
| `src/app/api/ai/route.ts` | B1/B2 | B1, B2, **B2.1** |
| `src/app/api/ai/route.test.ts` | B1/B2 | B1, B2, **B2.1** |
| `src/lib/server/rate-limit.ts` | B1/B3 | B1, **B2.1**; no B3 source change is evidenced |
| `docs/engineering/PUBLIC_BETA_CHECKLIST.md` | B1/B2/B3 | B1, B2, **B2.1**, B3, **B4** |
| `docs/engineering/CODEBASE_XRAY_MASTER_STATUS.md` | B1/B2/B3 | B1, B2, B3, **B4** |

B4.2 applied these corrections to the manifest; the table above records the pre-correction review state.

The broad `B1/B3` label on most `src/lib/analysis/` engine files is also not supported by the B3 change list, which names only `src/lib/analysis/pipeline-reliability.test.ts` as a new analysis test and does not list the engine modules as B3-modified. The table therefore records `B1` for those modules and keeps the B3-specific test at B3. This is provenance metadata, not a reason to drop the files.

### 3.5 Template marker is not dotenv syntax

`.env.example` begins with `[TEMPLATE]`, which is not a valid dotenv assignment or comment. It is harmless to the application because the file is a template, but it is an avoidable setup trap and should be removed before distribution.

## 4. Dependency and missing-file review

### 4.1 No missing runtime dependency

The 318 resolved local edges cover the status rows and their unmodified `HEAD` dependencies. The following dependencies are intentionally **not** rows because they are already present at `HEAD` and are not part of the working-tree diff:

```text
src/lib/github/parse-url.ts
src/lib/github/endpoints.ts
src/lib/analysis/context.ts
src/lib/analysis/extractors/architecture.ts
src/lib/analysis/extractors/dependencies.ts
src/lib/analysis/extractors/docs.ts
src/lib/analysis/extractors/security.ts
src/lib/analysis/extractors/stats.ts
src/lib/analysis/extractors/testing.ts
src/lib/analysis/languages.ts
src/lib/analysis/scoring/overall.ts
src/components/ui/action-button.tsx
src/components/ui/demo-badge.tsx
src/components/ui/key-val.tsx
src/components/ui/mono-label.tsx
src/components/ui/panel.tsx
src/components/ui/section-shell.tsx
src/components/ui/status-dot.tsx
src/components/ui/tab-bar.tsx
src/components/structure/file-tree.tsx
src/components/structure/language-chart.tsx
src/components/structure/repo-structure.tsx
src/components/visualization/codebase-map.tsx
src/components/visualization/dep-graph.tsx
src/components/visualization/iso-map.tsx
src/components/system/system-status.tsx
src/components/navigation/section-nav.tsx
src/components/navigation/top-bar.tsx
src/components/layout/site-footer.tsx
src/components/ui/error-state.tsx
src/app/layout.tsx
```

All are present in `HEAD` and none is a new status path. The candidate therefore has no missing module; the commit plan relies on the pre-existing baseline for these files.

### 4.2 The only path outside every group at review time

`docs/engineering/reports/28-b4-1-owner-manifest-review.md` was outside all ten groups at B4.1 review time. B4.2 added it to B4-09; no other status path is missing from a group.

### 4.3 No duplicate assignment

All 154 paths occur exactly once. There are no paths in two groups. Group sizes are 15 + 34 + 10 + 14 + 2 + 19 + 2 + 5 + 52 + 1 = 154.

## 5. Secret, environment and generated-artifact review

- `.env.local` and all environment files were excluded from the manifest and were not read.
- `.cloud-attachments/` is ignored; no conversation transcript is in the candidate.
- No `test-results/`, `playwright-report/`, trace, screenshot or transient browser artifact is in status. The only images are the three intentional B2 evidence files.
- No benchmark temp directory is in the workspace status. The two benchmark records under `docs/engineering/benchmarks/` are intentional generated evidence, covered by §3.2.
- No credential value was printed. The only credential-looking string found in prior scans is the synthetic fixture in `benchmarks/cases.ts`; it is not a live secret.
- The new B4.1 report is the only path created by this review. It is not staged.

### 5.1 Release-configuration verification

The B4 preview matrix was checked against the code and is internally consistent:

| Control | Required preview setting | Evidence |
|---|---|---|
| Shared quota enforcement | `REQUIRE_SHARED_QUOTA=1` | `requiresSharedQuota()` returns true for `VERCEL_ENV=production` or this flag; `activeQuotaStore()` returns `null`—and requests fail closed—when no shared store is available and this flag is set |
| AI disabled | `AI_DISABLED=1` | `aiPublicStatus()` returns unavailable; `/api/ai` is gated by the same emergency switch |
| GitHub token | Public-only read-only fine-grained `GITHUB_TOKEN` | Matrix instruction; value cannot be verified without the deployment secret store |
| Upstash | Isolated preview `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Matrix instruction; no live instance exists to inspect |
| Per-client limit | `ANALYSIS_RATE_LIMIT=6` | `quotaLimits()` default is 6 and the matrix sets it explicitly |
| Global limit | `ANALYSIS_GLOBAL_LIMIT=8` | Code default and matrix agree |
| Hourly limit | `SCAN_HOURLY_LIMIT=24` | Code default and matrix agree |
| AI public enablement | `AI_PUBLIC_ENABLED` unset | Matrix says do not opt in; hosted status would otherwise change |
| AI credentials | `AI_API_KEY`, `AI_ANALYSIS_SECRET` unset | Matrix says no provider spend and no binding issued |
| Memory fallback | `ALLOW_MEMORY_QUOTA` unset | Default preview path is memory; `REQUIRE_SHARED_QUOTA=1` prevents it |
| Anonymous GitHub | `ALLOW_ANONYMOUS_GITHUB` unset | Matrix says do not permit production-style anonymous scans |

This verifies the **intended configuration**, not a deployment. No Vercel environment, isolated Upstash database or read-only token was available to inspect. The preview remains unverified until the exact SHA is deployed and the smoke script runs.

## 6. Review integrity note

During verification I ran `npm run benchmark -- --run` without `BENCHMARK_OUT_DIR`. That probe rewrote the generated `docs/engineering/benchmarks/latest.json` and `latest.md` with a 2026-11-07 timestamp. I restored the recorded 2026-11-05 timestamp and the durations shown by the pre-probe markdown. The JSON was reconstructed from the same seven-case deterministic output and the recorded durations; byte-for-byte identity of the original JSON is not independently provable from Git because both files are untracked. This was a temporary read-only violation, is disclosed here, and did not change the 154-path inventory or any source file.

## 7. Commit-group audit

| # | Title | Files | Required preceding groups | Tests required | Risk | Independently reviewable |
|---|---|---:|---|---|---|---|
| 1 | chore(release): establish shared contracts and candidate configuration | 15 | — | typecheck, lint, config tests | Medium: env, package, headers, types | Yes at file level; full app gate not demonstrated at this boundary |
| 2 | feat(analysis): add deterministic engine, parsers and scoring | 34 | 1 | full unit suite, build | Medium: scoring/report correctness | Yes, but large; depends on 1 |
| 3 | feat(security): add GitHub admission and shared quota controls | 10 | 1, 2 | full tests, route tests, quota tests | High: live Redis unverified | Yes, after 2 |
| 4 | feat(ai): add validated explanation boundary and availability gates | 14 | 1, 2 | AI/token/schema tests | High: no live provider | Yes, after 2 |
| 5 | feat(api): harden analyze admission and error handling | 2 | 1–4 | full tests, build | High: primary request boundary | Yes, after 4 |
| 6 | feat(ui): render accessible report and coverage states | 19 | 1, 2 | component tests, build, axe | Medium: visual/accessibility | Yes, after 2 |
| 7 | test(e2e): add browser and accessibility journeys | 2 | 5, 6 | Playwright | Medium: CI unverified | Yes, after UI |
| 8 | ci: run full release gates and Playwright | 5 | 1–7 | YAML parse, local equivalent | Medium: first remote run pending | Yes as configuration; not independently executed |
| 9 | docs: record release evidence, limits and operations | 52 | 1–8 | documentation consistency | Low | Yes |
| 10 | chore: remove unused score-pill component | 1 | 6 | build, no-reference check | Low: accepted deletion | Yes, last |

The sequence is dependency-safe at the module level. Group 1 supplies types, environment, package and AI primitives; group 2 supplies the engine; group 3 supplies server/GitHub controls; group 4 supplies AI consumers; group 5 wires the analyze route; group 6 supplies the report UI; group 7 supplies the browser harness; group 8 supplies CI; group 9 documents; group 10 deletes only after the UI is complete. The caveat is that no group-boundary CI run exists, so “dependency-safe” means the direct import graph is ordered correctly, not that every intermediate commit has been independently gated.

### B4-01 foundation/config — 15 paths

chore(release): establish shared contracts and candidate configuration

```text
.env.example
.gitignore
.vercelignore
next.config.ts
package-lock.json
package.json
src/lib/ai/analysis-token.ts
src/lib/ai/config.ts
src/lib/ai/types.ts
src/lib/config/env.ts
src/lib/types/analysis.ts
src/lib/utils/format.ts
src/lib/version.ts
vitest.benchmark.config.ts
vitest.config.ts
```

### B4-02 analysis engine — 34 paths

feat(analysis): add deterministic engine, parsers and scoring

```text
src/lib/analysis/architecture-profile.ts
src/lib/analysis/budgets.test.ts
src/lib/analysis/budgets.ts
src/lib/analysis/capabilities.test.ts
src/lib/analysis/capabilities.ts
src/lib/analysis/critical.test.ts
src/lib/analysis/critical.ts
src/lib/analysis/graph.test.ts
src/lib/analysis/graph.ts
src/lib/analysis/insights.ts
src/lib/analysis/issues/detectors.ts
src/lib/analysis/limits.ts
src/lib/analysis/parsers/common.ts
src/lib/analysis/parsers/generic-parser.ts
src/lib/analysis/parsers/python-parser.ts
src/lib/analysis/parsers/registry.test.ts
src/lib/analysis/parsers/registry.ts
src/lib/analysis/parsers/types.ts
src/lib/analysis/parsers/typescript-parser.ts
src/lib/analysis/pipeline-private.test.ts
src/lib/analysis/pipeline-reliability.test.ts
src/lib/analysis/pipeline.test.ts
src/lib/analysis/pipeline.ts
src/lib/analysis/quality.test.ts
src/lib/analysis/quality.ts
src/lib/analysis/scoring/sectors.test.ts
src/lib/analysis/scoring/sectors.ts
src/lib/analysis/scoring/weights.ts
src/lib/analysis/security-rules.ts
src/lib/analysis/status.ts
src/lib/analysis/tree-utils.test.ts
src/lib/analysis/tree-utils.ts
src/lib/mock/repo-analysis.ts
src/lib/mock/scan-stages.ts
```

### B4-03 GitHub/server controls — 10 paths

feat(security): add GitHub admission and shared quota controls

```text
src/lib/github/admission.test.ts
src/lib/github/admission.ts
src/lib/github/client.ts
src/lib/server/observability.ts
src/lib/server/quota-store.test.ts
src/lib/server/quota-store.ts
src/lib/server/rate-limit.test.ts
src/lib/server/rate-limit.ts
src/lib/server/request-guards.test.ts
src/lib/server/request-guards.ts
```

### B4-04 AI boundary — 14 paths

feat(ai): add validated explanation boundary and availability gates

```text
src/app/api/ai/route.test.ts
src/app/api/ai/route.ts
src/lib/ai/analysis-token.test.ts
src/lib/ai/config.test.ts
src/lib/ai/context.ts
src/lib/ai/prompt-injection.test.ts
src/lib/ai/prompts.ts
src/lib/ai/provider.ts
src/lib/ai/request-schema.test.ts
src/lib/ai/request-schema.ts
src/lib/ai/service.test.ts
src/lib/ai/service.ts
src/lib/ai/validate.test.ts
src/lib/ai/validate.ts
```

### B4-05 analyze API — 2 paths

feat(api): harden analyze admission and error handling

```text
src/app/api/analyze/route.test.ts
src/app/api/analyze/route.ts
```

### B4-06 report UI — 19 paths

feat(ui): render accessible report and coverage states

```text
src/app/globals.css
src/app/page.tsx
src/components/ai/assistant-panel.test.tsx
src/components/ai/assistant-panel.tsx
src/components/analysis/analysis-summary.tsx
src/components/hero/repo-form.tsx
src/components/hero/scan-hero.tsx
src/components/hero/scan-overlay.tsx
src/components/insights/insights-section.tsx
src/components/issues/issues-section.test.tsx
src/components/issues/issues-section.tsx
src/components/presentation-layer.tsx
src/components/public-beta-notice.tsx
src/components/system/coverage-section.test.tsx
src/components/system/coverage-section.tsx
src/components/ui/empty-state.tsx
src/components/ui/meter.tsx
src/components/ui/severity-chip.tsx
src/components/xray-experience.tsx
```

### B4-07 browser harness — 2 paths

test(e2e): add browser and accessibility journeys

```text
e2e/b2-public-beta.spec.ts
playwright.config.ts
```

### B4-08 CI/benchmarks — 5 paths

ci: run full release gates and Playwright

```text
.github/workflows/ci.yml
benchmarks/accuracy.test.ts
benchmarks/b3-performance.test.ts
benchmarks/cases.ts
benchmarks/runner.ts
```

### B4-09 documentation — 52 paths

docs: record release evidence, limits and operations

```text
README.md
docs/engineering/ARCHITECTURE.md
docs/engineering/CODEBASE_XRAY_FINAL_ENGINEERING_REPORT.md
docs/engineering/CODEBASE_XRAY_MASTER_STATUS.md
docs/engineering/CODEBASE_XRAY_MILESTONE_2_REPORT.md
docs/engineering/CODEBASE_XRAY_MILESTONE_3_REPORT.md
docs/engineering/KNOWN_LIMITATIONS.md
docs/engineering/PUBLIC_BETA_CHECKLIST.md
docs/engineering/ai-evaluation.md
docs/engineering/benchmarks/README.md
docs/engineering/benchmarks/latest.json
docs/engineering/benchmarks/latest.md
docs/engineering/reports/00-initial-baseline.md
docs/engineering/reports/01-stabilisation-report.md
docs/engineering/reports/02-core-analysis-engine-report.md
docs/engineering/reports/03-evidence-scoring-report.md
docs/engineering/reports/04-ai-intelligence-report.md
docs/engineering/reports/05-quality-security-production-report.md
docs/engineering/reports/06-current-state-verification-report.md
docs/engineering/reports/07-analysis-accuracy-benchmark-report.md
docs/engineering/reports/08-language-capability-report.md
docs/engineering/reports/09-adaptive-scanning-validation-report.md
docs/engineering/reports/10-ai-intelligence-validation-report.md
docs/engineering/reports/11-frontend-quality-report.md
docs/engineering/reports/12-security-and-production-readiness-report.md
docs/engineering/reports/13-performance-and-scalability-report.md
docs/engineering/reports/14-report-and-scoring-completeness-report.md
docs/engineering/reports/15-testing-and-ci-report.md
docs/engineering/reports/16-pre-deployment-baseline.md
docs/engineering/reports/17-vercel-deployment-architecture-report.md
docs/engineering/reports/18-shared-rate-limiting-report.md
docs/engineering/reports/19-github-api-protection-report.md
docs/engineering/reports/20-public-beta-security-audit.md
docs/engineering/reports/21-ai-public-beta-readiness.md
docs/engineering/reports/22-public-beta-ux-report.md
docs/engineering/reports/23-vercel-deployment-execution-report.md
docs/engineering/reports/24-live-production-verification-report.md
docs/engineering/reports/25-b2-independent-verification-report.md
docs/engineering/reports/25-b2-owner-release-checklist.md
docs/engineering/reports/25-public-beta-cost-and-operations-report.md
docs/engineering/reports/26-b2-1-release-candidate-audit.md
docs/engineering/reports/26-b2-1-release-candidate-manifest.md
docs/engineering/reports/27-b3-autonomous-execution-report.md
docs/engineering/reports/27-b3-owner-action-checklist.md
docs/engineering/reports/27-b3-performance-results.md
docs/engineering/reports/27-b3-private-beta-operations-runbook.md
docs/engineering/reports/27-b3-security-verification.md
docs/engineering/reports/28-b4-controlled-release-report.md
docs/engineering/reports/28-b4-release-candidate-manifest.md
docs/engineering/reports/b2-evidence/b2-demo-desktop.png
docs/engineering/reports/b2-evidence/b2-demo-mobile.png
docs/engineering/reports/b2-evidence/b2-live-desktop.png
```

### B4-10 deletion — 1 paths

chore: remove unused score-pill component

```text
src/components/ui/score-pill.tsx
```

## 8. Exact recommended release file set

**Runtime/test/release set:** the 154 paths in §2, exactly once, in the ten groups above. No source path is missing. The pre-existing modules listed in §4.1 travel in `HEAD` and are not new changes.

**Documentation addendum:** B4.2 added `docs/engineering/reports/28-b4-1-owner-manifest-review.md` to B4-09 and expanded the manifest to 155 paths.

**Do not add:** `.env.local`, `.cloud-attachments/`, `.next/`, `test-results/`, `playwright-report/`, `.vercel/`, `.freebuff/`, temporary benchmark output, browser traces, or any secret.

## 9. File-level corrections required before A

1. **B4.1 report scope — resolved by B4.2:** `docs/engineering/reports/28-b4-1-owner-manifest-review.md` is now path 155 in B4-09.
2. **Generated benchmark evidence:** either regenerate `docs/engineering/benchmarks/latest.json` and `latest.md` on the exact candidate (writing the artifacts deliberately), or rename/annotate them as the 2026-11-05 historical snapshot. Do not label a stale run “latest” without qualification.
3. **Environment template:** remove the invalid `[TEMPLATE]` first line from `.env.example`; keep all placeholder values empty.
4. **Manifest provenance:** correct the six history labels in §3.4 and remove unsupported B3 labels from engine rows, or state that the `Origin` column is approximate. This is metadata, not a source change.

No source-code correction is required by this review. The PostCSS/Next 16 decision remains an independent release risk and is not reclassified by this manifest audit.

## 10. Files requiring explicit owner review

- `.env.example` — production/preview variable contract.
- `package.json` and `package-lock.json` — PostCSS high advisory and dependency graph.
- `.github/workflows/ci.yml` — first remote execution not observed.
- `next.config.ts` — headers and missing HSTS.
- `src/lib/ai/config.ts`, `src/lib/ai/config.test.ts`, `src/app/api/ai/route.ts`, `src/lib/ai/analysis-token.ts`, `src/lib/ai/service.ts` — AI gates and provider boundary.
- `src/app/api/analyze/route.ts` — quota ordering, private-repository rejection, partial results.
- `src/lib/server/rate-limit.ts`, `quota-store.ts`, `request-guards.ts` — shared-quota fail-closed behavior.
- `src/lib/github/client.ts`, `admission.ts` — external network and cost admission.
- `src/lib/analysis/pipeline.ts` — confidentiality and analysis correctness.
- `docs/engineering/benchmarks/latest.json`, `latest.md` — generated evidence freshness.
- `docs/engineering/reports/25-public-beta-cost-and-operations-report.md` — preserved historical 40/min text with dated correction.
- `docs/engineering/reports/27-b3-private-beta-operations-runbook.md` — external operations still unexecuted.
- `docs/engineering/reports/28-b4-controlled-release-report.md` and the manifest — the approval package itself.
- `src/components/ui/score-pill.tsx` — the only deletion.

## 11. Final recommendation

**B — APPROVE AFTER SPECIFIED FILE-LEVEL CORRECTIONS.**

The 154-row file classification is sound: the candidate contains no accidental environment file, transcript, browser trace, secret, build output or unrelated duplicate. The commit sequence is dependency-safe by direct import order. The four corrections above are narrow release-record and template issues; none requires changing the analysis engine, routes, quota logic or security behavior. After they are resolved, the 154/155-row manifest can move to A.

The B4 release verdict remains **B** for the separate reasons already recorded: no candidate SHA, no GitHub Actions run, no live Upstash/provenance/AI verification, the PostCSS advisory, missing HSTS and outstanding manual accessibility checks.

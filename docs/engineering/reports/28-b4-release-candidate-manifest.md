# 28 — B4 Release Candidate Manifest

**Status:** Proposed manifest only. **Nothing is staged or committed.**
**Repository:** `D:\CODEBASEXRAY`
**Branch / HEAD:** `master` / `e287e079b2ab086e5339192dd1bd86c1c48192cf`
**Generated:** 2026-11-07
**Inventory:** 155 paths. Modified 42 · deleted 1 · untracked 112 · staged 0.

This manifest supersedes the B2.1 and B3 inventory for release-candidate decisions. It is built from `git status --porcelain=v1 -uall`, not timestamps. The three B4/B4.1 release-record files are listed explicitly even though they are created immediately after the table is generated.

## Decision legend

- **INCLUDE** — part of the release candidate; owner review still required before staging.
- **DEPENDENCY** — required by an included runtime or test path; travels with its importer.
- **HOLD** — none. Both B2.1 HOLDs were resolved and rechecked in B4.
- **EXCLUDE** — not release content. Ignored/generated/sensitive paths are listed after the table.

Origin labels are approximate/best-known batch history, not proof of per-commit authorship. Where history is mixed, the label lists every evidenced batch. No timestamp was used as proof of origin; exact provenance cannot be established from timestamps or the current tree alone.

## Complete inventory

| File path | Status | Origin | Purpose | Decision | Commit group | Risk / review note |
|---|---|---|---|---|---|---|

| `.env.example` | M | B1/B2 | Environment variable contract; names/defaults only | **INCLUDE** | B4-01 foundation/config | Medium: production config contract |
| `.github/workflows/ci.yml` | ?? | B1/B3 | CI gates: lint, typecheck, tests, benchmark, build, Chromium, Playwright, failure artifacts | **INCLUDE** | B4-08 CI/benchmarks | Medium: not yet observed on GitHub |
| `.gitignore` | M | B1/B2/B2.1 | Ignore local transcripts, env files, generated build/browser output | **INCLUDE** | B4-01 foundation/config | Low |
| `.vercelignore` | ?? | B1 | Exclude docs, benchmarks, CI and local transcripts from deployment upload | **INCLUDE** | B4-01 foundation/config | Low |
| `README.md` | M | B1/B2/B3/B4 | Product scope, setup, security behavior and limitations; B4 fixes request-flow and shared-store wording | **INCLUDE** | B4-09 documentation | Low: claims reviewed |
| `benchmarks/accuracy.test.ts` | ?? | B1/B3 | Accuracy/performance fixture or benchmark runner | **INCLUDE** | B4-08 CI/benchmarks | Low: local fixtures only |
| `benchmarks/b3-performance.test.ts` | ?? | B3 | B3 deterministic performance harness | **INCLUDE** | B4-08 CI/benchmarks | Low: synthetic fixtures |
| `benchmarks/cases.ts` | ?? | B1/B3 | Accuracy/performance fixture or benchmark runner | **INCLUDE** | B4-08 CI/benchmarks | Low: local fixtures only |
| `benchmarks/runner.ts` | ?? | B1/B3 | Accuracy/performance fixture or benchmark runner | **INCLUDE** | B4-08 CI/benchmarks | Low: local fixtures only |
| `docs/engineering/ARCHITECTURE.md` | ?? | B1/B2/B3 | Living engineering, operations or limitation documentation | **INCLUDE** | B4-09 documentation | Low: documentation |
| `docs/engineering/CODEBASE_XRAY_FINAL_ENGINEERING_REPORT.md` | ?? | B1/B2/B3 | Living engineering, operations or limitation documentation | **INCLUDE** | B4-09 documentation | Low: documentation |
| `docs/engineering/CODEBASE_XRAY_MASTER_STATUS.md` | ?? | B1/B2/B3/B4 | Living engineering, operations or limitation documentation | **INCLUDE** | B4-09 documentation | Low: documentation |
| `docs/engineering/CODEBASE_XRAY_MILESTONE_2_REPORT.md` | ?? | B1/B2/B3 | Living engineering, operations or limitation documentation | **INCLUDE** | B4-09 documentation | Low: documentation |
| `docs/engineering/CODEBASE_XRAY_MILESTONE_3_REPORT.md` | ?? | B1/B2/B3 | Living engineering, operations or limitation documentation | **INCLUDE** | B4-09 documentation | Low: documentation |
| `docs/engineering/KNOWN_LIMITATIONS.md` | ?? | B1/B2/B3 | Living engineering, operations or limitation documentation | **INCLUDE** | B4-09 documentation | Low: documentation |
| `docs/engineering/PUBLIC_BETA_CHECKLIST.md` | ?? | B1/B2/B2.1/B3/B4 | Living engineering, operations or limitation documentation | **INCLUDE** | B4-09 documentation | Low: documentation |
| `docs/engineering/ai-evaluation.md` | ?? | B1/B2/B3 | Living engineering, operations or limitation documentation | **INCLUDE** | B4-09 documentation | Low: documentation |
| `docs/engineering/benchmarks/README.md` | ?? | B1 | Accuracy benchmark record | **INCLUDE** | B4-09 documentation | Low: generated fixture record |
| `docs/engineering/benchmarks/latest.json` | ?? | B1 | Accuracy benchmark record | **INCLUDE** | B4-09 documentation | Low: generated fixture record |
| `docs/engineering/benchmarks/latest.md` | ?? | B1 | Accuracy benchmark record | **INCLUDE** | B4-09 documentation | Low: generated fixture record |
| `docs/engineering/reports/00-initial-baseline.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/01-stabilisation-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/02-core-analysis-engine-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/03-evidence-scoring-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/04-ai-intelligence-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/05-quality-security-production-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/06-current-state-verification-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/07-analysis-accuracy-benchmark-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/08-language-capability-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/09-adaptive-scanning-validation-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/10-ai-intelligence-validation-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/11-frontend-quality-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/12-security-and-production-readiness-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/13-performance-and-scalability-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/14-report-and-scoring-completeness-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/15-testing-and-ci-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/16-pre-deployment-baseline.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/17-vercel-deployment-architecture-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/18-shared-rate-limiting-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/19-github-api-protection-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/20-public-beta-security-audit.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/21-ai-public-beta-readiness.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/22-public-beta-ux-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/23-vercel-deployment-execution-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/24-live-production-verification-report.md` | ?? | B1/B2 | Historical engineering report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/25-b2-independent-verification-report.md` | ?? | B2/B3 | B2 verification/checklist/cost record | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/25-b2-owner-release-checklist.md` | ?? | B2/B3 | B2 verification/checklist/cost record | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/25-public-beta-cost-and-operations-report.md` | ?? | B1/B3 | Historical cost report with dated 8/min correction; original 40/min text preserved | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/26-b2-1-release-candidate-audit.md` | ?? | B2.1 | B2.1 release audit/manifest | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/26-b2-1-release-candidate-manifest.md` | ?? | B2.1 | B2.1 release audit/manifest | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/27-b3-autonomous-execution-report.md` | ?? | B3 | B3 engineering evidence/report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/27-b3-owner-action-checklist.md` | ?? | B3 | B3 engineering evidence/report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/27-b3-performance-results.md` | ?? | B3 | B3 engineering evidence/report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/27-b3-private-beta-operations-runbook.md` | ?? | B3 | B3 engineering evidence/report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/27-b3-security-verification.md` | ?? | B3 | B3 engineering evidence/report | **INCLUDE** | B4-09 documentation | Low: historical record |
| `docs/engineering/reports/28-b4-controlled-release-report.md` | ?? | B4 | B4 controlled release report and approval package | **INCLUDE** | B4-09 documentation | Low: release record |
| `docs/engineering/reports/28-b4-1-owner-manifest-review.md` | ?? | B4.1 | Owner manifest review and B4.2 correction evidence | **INCLUDE** | B4-09 documentation | Low: release record |
| `docs/engineering/reports/28-b4-release-candidate-manifest.md` | ?? | B4 | B4 complete candidate inventory and commit-group assignment | **INCLUDE** | B4-09 documentation | Low: release record |
| `docs/engineering/reports/b2-evidence/b2-demo-desktop.png` | ?? | B2 | B2 visual evidence | **INCLUDE** | B4-09 documentation | Low: historical evidence |
| `docs/engineering/reports/b2-evidence/b2-demo-mobile.png` | ?? | B2 | B2 visual evidence | **INCLUDE** | B4-09 documentation | Low: historical evidence |
| `docs/engineering/reports/b2-evidence/b2-live-desktop.png` | ?? | B2 | B2 visual evidence | **INCLUDE** | B4-09 documentation | Low: historical evidence |
| `e2e/b2-public-beta.spec.ts` | ?? | B2/B3 | Playwright browser journeys; live GitHub case gated | **INCLUDE** | B4-07 browser harness | Medium: local browser only |
| `next.config.ts` | M | B1 | Security headers and externalized TypeScript runtime | **DEPENDENCY** | B4-01 foundation/config | Medium: headers only; HSTS absent |
| `package-lock.json` | M | B1/B3 | Locked dependency graph including Playwright and axe | **DEPENDENCY** | B4-01 foundation/config | Medium: nested postcss 8.4.31 |
| `package.json` | M | B1/B3 | Dependency and script metadata; axe direct dev dependency | **INCLUDE** | B4-01 foundation/config | Medium: PostCSS advisory pending owner decision |
| `playwright.config.ts` | ?? | B2 | Playwright local dev-server and browser configuration | **DEPENDENCY** | B4-07 browser harness | Medium: CI unverified |
| `src/app/api/ai/route.test.ts` | ?? | B1/B2/B2.1 | AI route gate and oversized-body regressions | **INCLUDE** | B4-04 AI boundary | Medium: no live provider |
| `src/app/api/ai/route.ts` | ?? | B1/B2/B2.1 | AI route; origin, hosted opt-in, schema, token, quota and provider gates | **INCLUDE** | B4-04 AI boundary | High: external provider boundary |
| `src/app/api/analyze/route.test.ts` | M | B1/B3 | Analyze route regressions: malformed/oversized input, quota ordering, origin, rate limit | **INCLUDE** | B4-05 analyze API | Medium: security tests |
| `src/app/api/analyze/route.ts` | M | B1/B3 | Analyze route; validates URL/config before quota, rejects private repos before retrieval, discloses partial results | **INCLUDE** | B4-05 analyze API | High: primary request boundary |
| `src/app/globals.css` | M | B1/B3 | Design tokens and contrast styles | **INCLUDE** | B4-06 report UI | Medium: accessibility |
| `src/app/page.tsx` | M | B1 | Application entry page | **INCLUDE** | B4-06 report UI | Medium: user journey |
| `src/components/ai/assistant-panel.test.tsx` | ?? | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/ai/assistant-panel.tsx` | ?? | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/analysis/analysis-summary.tsx` | M | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/hero/repo-form.tsx` | M | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/hero/scan-hero.tsx` | M | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/hero/scan-overlay.tsx` | M | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/insights/insights-section.tsx` | M | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/issues/issues-section.test.tsx` | ?? | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/issues/issues-section.tsx` | M | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/presentation-layer.tsx` | M | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/public-beta-notice.tsx` | ?? | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/system/coverage-section.test.tsx` | ?? | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/system/coverage-section.tsx` | ?? | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/ui/empty-state.tsx` | M | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/ui/meter.tsx` | M | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/ui/score-pill.tsx` | D | A/B3 | Accepted deletion of unused standalone score component | **INCLUDE** | B4-10 deletion | Low: no references; owner accepted deletion |
| `src/components/ui/severity-chip.tsx` | M | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/components/xray-experience.tsx` | M | B1/B3 | Report UI, accessibility states or component tests | **INCLUDE** | B4-06 report UI | Medium: visual behavior |
| `src/lib/ai/analysis-token.test.ts` | ?? | B1 | AI schema, provider, prompt, context, service or test | **INCLUDE** | B4-04 AI boundary | Medium: no live provider verification |
| `src/lib/ai/analysis-token.ts` | ?? | B1 | Expiring HMAC analysis-to-AI binding | **DEPENDENCY** | B4-01 foundation/config | High: replay until expiry is documented |
| `src/lib/ai/config.test.ts` | ?? | B4 | B4 tests for AI public availability gates | **INCLUDE** | B4-04 AI boundary | Low |
| `src/lib/ai/config.ts` | ?? | B1/B4 | AI configuration; B4 makes public status mirror emergency, hosted opt-in and production-secret gates | **DEPENDENCY** | B4-01 foundation/config | Medium: availability text must match route |
| `src/lib/ai/context.ts` | ?? | B1 | AI schema, provider, prompt, context, service or test | **INCLUDE** | B4-04 AI boundary | Medium: no live provider verification |
| `src/lib/ai/prompt-injection.test.ts` | ?? | B1 | AI schema, provider, prompt, context, service or test | **INCLUDE** | B4-04 AI boundary | Medium: no live provider verification |
| `src/lib/ai/prompts.ts` | ?? | B1 | AI schema, provider, prompt, context, service or test | **INCLUDE** | B4-04 AI boundary | Medium: no live provider verification |
| `src/lib/ai/provider.ts` | ?? | B1 | AI schema, provider, prompt, context, service or test | **INCLUDE** | B4-04 AI boundary | Medium: no live provider verification |
| `src/lib/ai/request-schema.test.ts` | ?? | B1 | AI schema, provider, prompt, context, service or test | **INCLUDE** | B4-04 AI boundary | Medium: no live provider verification |
| `src/lib/ai/request-schema.ts` | ?? | B1 | AI schema, provider, prompt, context, service or test | **INCLUDE** | B4-04 AI boundary | Medium: no live provider verification |
| `src/lib/ai/service.test.ts` | ?? | B1 | AI schema, provider, prompt, context, service or test | **INCLUDE** | B4-04 AI boundary | Medium: no live provider verification |
| `src/lib/ai/service.ts` | ?? | B1 | AI schema, provider, prompt, context, service or test | **INCLUDE** | B4-04 AI boundary | Medium: no live provider verification |
| `src/lib/ai/types.ts` | ?? | B1 | Shared AI request/status types | **DEPENDENCY** | B4-01 foundation/config | Low |
| `src/lib/ai/validate.test.ts` | ?? | B1 | AI schema, provider, prompt, context, service or test | **INCLUDE** | B4-04 AI boundary | Medium: no live provider verification |
| `src/lib/ai/validate.ts` | ?? | B1 | AI schema, provider, prompt, context, service or test | **INCLUDE** | B4-04 AI boundary | Medium: no live provider verification |
| `src/lib/analysis/architecture-profile.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/budgets.test.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/budgets.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/capabilities.test.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/capabilities.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/critical.test.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/critical.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/graph.test.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/graph.ts` | M | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/insights.ts` | M | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/issues/detectors.ts` | M | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/limits.ts` | M | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/parsers/common.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/parsers/generic-parser.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/parsers/python-parser.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/parsers/registry.test.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/parsers/registry.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/parsers/types.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/parsers/typescript-parser.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/pipeline-private.test.ts` | ?? | B1 | Private/malformed metadata rejection before tree/blob access | **INCLUDE** | B4-02 analysis engine | Medium: confidentiality test |
| `src/lib/analysis/pipeline-reliability.test.ts` | ?? | B3 | B3 controlled partial-result tests for failed blobs and malformed source | **INCLUDE** | B4-02 analysis engine | Medium: reliability tests |
| `src/lib/analysis/pipeline.test.ts` | M | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/pipeline.ts` | M | B1 | Deterministic analysis pipeline and private-repository confidentiality boundary | **DEPENDENCY** | B4-02 analysis engine | High: analysis correctness |
| `src/lib/analysis/quality.test.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/quality.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/scoring/sectors.test.ts` | M | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/scoring/sectors.ts` | M | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/scoring/weights.ts` | M | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/security-rules.ts` | ?? | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/status.ts` | M | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/tree-utils.test.ts` | M | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/analysis/tree-utils.ts` | M | B1 | Analysis engine, parser, graph, scoring, detector or tests | **INCLUDE** | B4-02 analysis engine | Medium: report correctness |
| `src/lib/config/env.ts` | M | B1 | Server-only environment access and production gates | **DEPENDENCY** | B4-01 foundation/config | High: fail-closed behavior |
| `src/lib/github/admission.test.ts` | ?? | B1 | GitHub client, URL parser, admission or tests | **INCLUDE** | B4-03 GitHub/server controls | High: external boundary |
| `src/lib/github/admission.ts` | ?? | B1 | Conservative GitHub request-cost admission and safety reserve | **DEPENDENCY** | B4-03 GitHub/server controls | High: estimate is not a reservation |
| `src/lib/github/client.ts` | M | B1 | Bounded GitHub REST client, ETag cache and error classification | **DEPENDENCY** | B4-03 GitHub/server controls | High: external network boundary |
| `src/lib/mock/repo-analysis.ts` | M | B1 | Deterministic demo fixture | **DEPENDENCY** | B4-02 analysis engine | Low: fictional data |
| `src/lib/mock/scan-stages.ts` | M | B1 | Deterministic demo fixture | **DEPENDENCY** | B4-02 analysis engine | Low: fictional data |
| `src/lib/server/observability.ts` | ?? | B1/B3 | Safe request IDs and structured logs; no secrets or source | **DEPENDENCY** | B4-03 GitHub/server controls | Low |
| `src/lib/server/quota-store.test.ts` | ?? | B1/B3 | Shared quota, request guard, observability or tests | **INCLUDE** | B4-03 GitHub/server controls | High: live Redis unverified |
| `src/lib/server/quota-store.ts` | ?? | B1 | Redis REST/Lua adapter and in-memory fallback | **DEPENDENCY** | B4-03 GitHub/server controls | High: live contention unverified |
| `src/lib/server/rate-limit.test.ts` | M | B1/B3 | Shared quota, request guard, observability or tests | **INCLUDE** | B4-03 GitHub/server controls | High: live Redis unverified |
| `src/lib/server/rate-limit.ts` | M | B1/B2.1 | Atomic per-client/global quota, hourly budget, scan lock; production fails closed | **DEPENDENCY** | B4-03 GitHub/server controls | High: live Redis unverified |
| `src/lib/server/request-guards.test.ts` | ?? | B1/B3 | Shared quota, request guard, observability or tests | **INCLUDE** | B4-03 GitHub/server controls | High: live Redis unverified |
| `src/lib/server/request-guards.ts` | ?? | B1/B2 | Same-origin and streamed body-size guards | **DEPENDENCY** | B4-03 GitHub/server controls | High: security boundary |
| `src/lib/types/analysis.ts` | M | B1 | Shared TypeScript contracts | **DEPENDENCY** | B4-01 foundation/config | Medium: type contract |
| `src/lib/utils/format.ts` | M | B1/B3 | Formatting helpers including accessible band text colors | **DEPENDENCY** | B4-01 foundation/config | Low |
| `src/lib/version.ts` | ?? | B1 | Engine version constant | **DEPENDENCY** | B4-01 foundation/config | Low |
| `vitest.benchmark.config.ts` | ?? | B1 | Vitest/benchmark test runner configuration | **DEPENDENCY** | B4-01 foundation/config | Low |
| `vitest.config.ts` | M | B1 | Vitest/benchmark test runner configuration | **DEPENDENCY** | B4-01 foundation/config | Low |

## Summary by commit group

| Group | Paths |
|---|---:|
| B4-01 foundation/config | 15 |
| B4-02 analysis engine | 34 |
| B4-03 GitHub/server controls | 10 |
| B4-04 AI boundary | 14 |
| B4-05 analyze API | 2 |
| B4-06 report UI | 19 |
| B4-07 browser harness | 2 |
| B4-08 CI/benchmarks | 5 |
| B4-09 documentation | 53 |
| B4-10 deletion | 1 |

## Excluded from the candidate

These paths are ignored or local and are **not** part of the 155-row inventory:

- `.cloud-attachments/imported-conversation-*.json` — private imported transcript; ignored, retained on disk, never release content.
- `.env.local` — local environment values; not read during B4 and never staged.
- `.next/`, `test-results/`, `playwright-report/`, `node_modules/`, `*.tsbuildinfo`, `.vercel/`, `.freebuff/` — generated, local, or provider state.
- `.vercel/project.json` — local Vercel linkage; ignored and not release content.
- Temporary benchmark output outside the workspace.

## HOLD status

- `src/components/ui/score-pill.tsx` — deletion accepted after independent history/no-reference/build review; **INCLUDE**.
- `docs/engineering/reports/25-public-beta-cost-and-operations-report.md` — dated correction preserves the historical 40/min statement and states the current 8/min global, 6/min per-client and 24/hour defaults; **INCLUDE**.
- PostCSS/Next — no file is excluded. `package.json` and `package-lock.json` remain in the candidate with the residual advisory documented; the owner must choose temporary acceptance or a separate Next 16 migration.

## Dependency completeness

The inventory includes all source modules, shared types, API routes, component tests, browser harness, benchmark fixtures, package lock, CI, and deployment-ignore metadata. No status path is orphaned. The deletion has no remaining import. The only production runtime dependencies not represented by working-tree changes are already present at HEAD (for example `src/lib/github/parse-url.ts`).

## Boundary note

The manifest is not a commit. It does not authorize staging, committing, pushing or deploying. The exact proposed commit sequence and its checks are in `28-b4-controlled-release-report.md`.

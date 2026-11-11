# 26 — B2.1 Release Candidate Manifest

**Status:** Proposed manifest only. **Nothing is staged or committed.**
**Repository:** `D:\CODEBASEXRAY`
**Baseline branch/HEAD:** `master` / `e287e079b2ab086e5339192dd1bd86c1c48192cf`
**Generated:** 2026-11-06

## Counts

| Measure | Value |
|---|---:|
| Modified tracked files | 37 |
| Deleted tracked files | 1 |
| Untracked files (`-uall`, before the B2.1 ignore rule) | 100 |
| Staged files | 0 |
| Total inventory rows | 138 |
| Category A | 1 |
| Category B | 114 |
| Category C | 8 |
| Category D | 14 |
| Category E | 1 |

The historical “36 untracked entries” was a directory-level count. `git status -uall` showed **100 individual untracked files** before the B2.1 ignore rule. `.cloud-attachments/` is now ignored but remains on disk; it is retained in this inventory because it existed in the audited baseline.

## Inventory legend

- **A** — pre-existing project work; **B** — B1; **C** — B2; **D** — mixed B1/B2; **E** — generated, disposable or sensitive.
- **INCLUDE** — proposed for the release candidate, subject to owner review. DEPENDENCY is included but is not a standalone feature.
- **HOLD** — needs a specific owner decision or documentation correction.
- **DEPENDENCY** — required by an INCLUDE file and therefore part of the candidate; it travels with its importer.
- **EXCLUDE** — do not include in the release candidate.
- Every row is one path. Directories are expanded to files. Status is the baseline Git status (`M`, `D`, `??`).

## Complete file inventory

| File path | Status | Class | Purpose | RC | Evidence | Risk |
|---|---|---|---|---|---|---|
| `.env.example` | M | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Security-sensitive or operational review required |
| `.gitignore` | M | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Security-sensitive or operational review required |
| `README.md` | M | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Security-sensitive or operational review required |
| `next.config.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `package-lock.json` | M | D | B1/B2 shared contract or hardened boundary | **DEPENDENCY** | B1 and B2 reports; current diff/source inspection | Medium: postcss advisories remain; no forced Next 16 upgrade |
| `package.json` | M | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Medium: postcss advisories remain; no forced Next 16 upgrade |
| `src/app/api/analyze/route.test.ts` | M | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Medium: security-sensitive route |
| `src/app/api/analyze/route.ts` | M | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Medium: security-sensitive route |
| `src/app/page.tsx` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/hero/repo-form.tsx` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/hero/scan-hero.tsx` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/hero/scan-overlay.tsx` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/insights/insights-section.tsx` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/issues/issues-section.tsx` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/presentation-layer.tsx` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/ui/empty-state.tsx` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/ui/score-pill.tsx` | D | A | Unused ScorePill component deletion (pre-existing) | **HOLD** | HEAD contains file; working tree deletes it; no imports; build passes; B1 report calls it pre-existing | Owner must confirm deletion intent; do not restore blindly |
| `src/components/xray-experience.tsx` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/graph.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/insights.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/issues/detectors.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/limits.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/pipeline.test.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/pipeline.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/scoring/sectors.test.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/scoring/sectors.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/scoring/weights.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/status.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/tree-utils.test.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/tree-utils.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/config/env.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/github/client.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/mock/repo-analysis.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/mock/scan-stages.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/server/rate-limit.test.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Medium: quota/request boundary; live Redis unverified |
| `src/lib/server/rate-limit.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Medium: quota/request boundary; live Redis unverified |
| `src/lib/types/analysis.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `vitest.config.ts` | M | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `.cloud-attachments/imported-conversation-2a607ab8fdef4d6efac7d60d6cf4f32e497bb2b5f1910a666775c4b9d6809c66.json` | ?? | E | Imported conversation transcript; not release content | **EXCLUDE** | Baseline inventory; 1.8 MB JSON attachment | High privacy/accidental-inclusion risk |
| `.github/workflows/ci.yml` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `.vercelignore` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `benchmarks/accuracy.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `benchmarks/cases.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `benchmarks/runner.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `docs/engineering/ARCHITECTURE.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `docs/engineering/CODEBASE_XRAY_FINAL_ENGINEERING_REPORT.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `docs/engineering/CODEBASE_XRAY_MASTER_STATUS.md` | ?? | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Security-sensitive or operational review required |
| `docs/engineering/CODEBASE_XRAY_MILESTONE_2_REPORT.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `docs/engineering/CODEBASE_XRAY_MILESTONE_3_REPORT.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `docs/engineering/KNOWN_LIMITATIONS.md` | ?? | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Security-sensitive or operational review required |
| `docs/engineering/PUBLIC_BETA_CHECKLIST.md` | ?? | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Security-sensitive or operational review required |
| `docs/engineering/ai-evaluation.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `docs/engineering/benchmarks/README.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `docs/engineering/benchmarks/latest.json` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `docs/engineering/benchmarks/latest.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `docs/engineering/reports/00-initial-baseline.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/01-stabilisation-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/02-core-analysis-engine-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/03-evidence-scoring-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/04-ai-intelligence-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/05-quality-security-production-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/06-current-state-verification-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/07-analysis-accuracy-benchmark-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/08-language-capability-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/09-adaptive-scanning-validation-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/10-ai-intelligence-validation-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/11-frontend-quality-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/12-security-and-production-readiness-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/13-performance-and-scalability-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/14-report-and-scoring-completeness-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/15-testing-and-ci-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/16-pre-deployment-baseline.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/17-vercel-deployment-architecture-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/18-shared-rate-limiting-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/19-github-api-protection-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/20-public-beta-security-audit.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/21-ai-public-beta-readiness.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/22-public-beta-ux-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/23-vercel-deployment-execution-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/24-live-production-verification-report.md` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low: historical release documentation |
| `docs/engineering/reports/25-b2-independent-verification-report.md` | ?? | C | B2 browser, regression or verification evidence | **INCLUDE** | B2 report; current test/config inspection | Low: historical release documentation |
| `docs/engineering/reports/25-b2-owner-release-checklist.md` | ?? | C | B2 browser, regression or verification evidence | **INCLUDE** | B2 report; current test/config inspection | Low: historical release documentation |
| `docs/engineering/reports/25-public-beta-cost-and-operations-report.md` | ?? | B | B1 cost/operations report | **HOLD** | Historical report; code default is 8/min global, report says 40/min | Documentation discrepancy; do not rewrite historical report without owner decision |
| `docs/engineering/reports/b2-evidence/b2-demo-desktop.png` | ?? | C | B2 browser, regression or verification evidence | **INCLUDE** | B2 report; current test/config inspection | Low: historical release documentation |
| `docs/engineering/reports/b2-evidence/b2-demo-mobile.png` | ?? | C | B2 browser, regression or verification evidence | **INCLUDE** | B2 report; current test/config inspection | Low: historical release documentation |
| `docs/engineering/reports/b2-evidence/b2-live-desktop.png` | ?? | C | B2 browser, regression or verification evidence | **INCLUDE** | B2 report; current test/config inspection | Low: historical release documentation |
| `e2e/b2-public-beta.spec.ts` | ?? | C | B2 browser, regression or verification evidence | **INCLUDE** | B2 report; current test/config inspection | Low; browser artifacts are ignored by .gitignore |
| `playwright.config.ts` | ?? | C | B2 browser, regression or verification evidence | **DEPENDENCY** | B2 report; current test/config inspection | Low; browser artifacts are ignored by .gitignore |
| `src/app/api/ai/route.test.ts` | ?? | C | B2 browser, regression or verification evidence | **INCLUDE** | B2 report; current test/config inspection | Medium: security-sensitive route |
| `src/app/api/ai/route.ts` | ?? | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Medium: security-sensitive route |
| `src/components/ai/assistant-panel.test.tsx` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/ai/assistant-panel.tsx` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/issues/issues-section.test.tsx` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/public-beta-notice.tsx` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/system/coverage-section.test.tsx` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/components/system/coverage-section.tsx` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/analysis-token.test.ts` | ?? | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Security-sensitive or operational review required |
| `src/lib/ai/analysis-token.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/config.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/context.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/prompt-injection.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/prompts.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/provider.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/request-schema.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/request-schema.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/service.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/service.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/types.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/validate.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/ai/validate.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/architecture-profile.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/budgets.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/budgets.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/capabilities.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/capabilities.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/critical.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/critical.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/graph.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/parsers/common.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/parsers/generic-parser.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/parsers/python-parser.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/parsers/registry.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/parsers/registry.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/parsers/types.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/parsers/typescript-parser.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/pipeline-private.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/quality.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/quality.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/analysis/security-rules.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/github/admission.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/github/admission.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `src/lib/server/observability.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Medium: quota/request boundary; live Redis unverified |
| `src/lib/server/quota-store.test.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **INCLUDE** | B1 reports; path/test/import evidence | Medium: quota/request boundary; live Redis unverified |
| `src/lib/server/quota-store.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Medium: quota/request boundary; live Redis unverified |
| `src/lib/server/request-guards.test.ts` | ?? | D | B1/B2 shared contract or hardened boundary | **INCLUDE** | B1 and B2 reports; current diff/source inspection | Medium: quota/request boundary; live Redis unverified |
| `src/lib/server/request-guards.ts` | ?? | D | B1/B2 shared contract or hardened boundary | **DEPENDENCY** | B1 and B2 reports; current diff/source inspection | Medium: quota/request boundary; live Redis unverified |
| `src/lib/version.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |
| `vitest.benchmark.config.ts` | ?? | B | B1 implementation, tests, benchmark or engineering record | **DEPENDENCY** | B1 reports; path/test/import evidence | Low to medium depending on security boundary |

## Proposed release-candidate sets

### INCLUDE

All files marked `INCLUDE` or `DEPENDENCY` above: the B1 analysis, quota, GitHub-admission and AI-boundary implementation; B2 browser automation and regression tests; benchmark fixtures; CI and deployment configuration; and the engineering records. The runtime candidate depends on the source, tests, package metadata, `.env.example`, `next.config.ts`, `.gitignore`, TypeScript/Vitest configuration and the documentation listed there.

### HOLD

- `src/components/ui/score-pill.tsx` — deletion is pre-existing/unknown in origin; no remaining import and the build passes, but do not restore or commit the deletion without owner confirmation.
- `docs/engineering/reports/25-public-beta-cost-and-operations-report.md` — historical report says 40/min global analysis limit; current code defaults to 8/min. Do not rewrite the historical report; owner should decide whether to add a correction note.

### EXCLUDE

- `.cloud-attachments/imported-conversation-…json` — 1.8 MB imported conversation transcript; now ignored, not release content.
- `.next/`, `test-results/`, `playwright-report/`, `tsconfig.tsbuildinfo`, `node_modules/`, `.env.local`, `.vercel/`, `.freebuff/` — generated, local or secret-bearing; ignored by Git. They must never be staged.
- The live Playwright screenshot under `test-results/` is disposable; the preserved B2 evidence copies live under `docs/engineering/reports/b2-evidence/`.

### B2.1 safety fix

`.gitignore` now includes `/.cloud-attachments/`. This prevents the imported transcript from being accidentally staged. It does not delete or alter the transcript. It is the only B2.1 working-tree change outside the two new reports.

## Dependency completeness check

- `package.json` and `package-lock.json` include Playwright `1.65.0`, Vitest, React, Next, Tailwind/PostCSS and TypeScript.
- Browser tests depend on `playwright.config.ts`, `e2e/b2-public-beta.spec.ts`, the dev script on port 3210 and installed Chromium.
- AI files depend on the shared token, config and validation modules; all are present.
- API routes depend on `request-guards.ts`, `rate-limit.ts`, `quota-store.ts`, `observability.ts` and `admission.ts`; all are present.
- Benchmark fixtures are separate from `npm test`; `vitest.benchmark.config.ts` and the benchmark runner are present.
- Documentation references the B2 report, owner checklist and evidence images; all are present.
- No source import references the deleted `score-pill.tsx`; `rg` found no `ScorePill`/`score-pill` use.

## Proposed commit sequence (not executed)

1. **Core request/security boundary** — `src/lib/server/request-guards.ts`, `request-guards.test.ts`, `src/app/api/analyze/route.ts`, `route.test.ts`, `src/lib/config/env.ts`, `next.config.ts`.
2. **Quota, GitHub admission and observability** — `src/lib/server/rate-limit.ts`, `rate-limit.test.ts`, `quota-store.ts`, `quota-store.test.ts`, `src/lib/github/admission.ts`, `admission.test.ts`, `observability.ts`.
3. **AI boundary** — `src/lib/ai/**`, `src/app/api/ai/route.ts`, `src/app/api/ai/route.test.ts`.
4. **Analysis/scoring/UI corrections** — `src/lib/analysis/**`, `src/components/**`, `src/app/page.tsx`, `src/lib/mock/**`, `src/lib/types/analysis.ts`.
5. **Browser verification** — `playwright.config.ts`, `e2e/b2-public-beta.spec.ts`, `package.json`, `package-lock.json`, `.gitignore`.
6. **Documentation** — `README.md`, `.env.example`, `docs/engineering/**` (excluding the HOLD report until corrected), benchmark artifacts.
7. **Pre-existing deletion decision** — do not include `src/components/ui/score-pill.tsx` until the owner confirms it.

Each group needs the checks in the B2.1 audit report. No commit hash was generated and no path was staged.

## Proposed additions from B2.1

The two B2.1 reports are release-audit documentation and are proposed as `INCLUDE`:
- `docs/engineering/reports/26-b2-1-release-candidate-audit.md`
- `docs/engineering/reports/26-b2-1-release-candidate-manifest.md`

They should be reviewed before inclusion; they are not product runtime dependencies.

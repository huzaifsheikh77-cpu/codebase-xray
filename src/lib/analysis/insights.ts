import type { Insight } from "@/lib/types/analysis";
import { formatCompact } from "@/lib/utils/format";
import type { DetectionInput } from "./issues/detectors";

/**
 * INSIGHTS — rule-based, derived from real signals only (no AI model in
 * this phase). Each insight carries actual numbers as evidence; when a
 * signal is weak/absent the insight is simply not generated (amendment #10).
 */
export function buildInsights(s: DetectionInput): Insight[] {
  const out: Insight[] = [];

  /* testing */
  if (s.stats.sourceFiles > 0) {
    const ratioPct = Math.round((s.testing.ratio ?? 0) * 100);
    const gap = s.testing.testFiles === 0;
    out.push({
      id: "INS-01",
      tag: "TESTING",
      title: gap ? "Test coverage is the biggest gap" : `Test-to-source ratio at ${ratioPct}%`,
      explanation: gap
        ? "No test files were detected anywhere in the tree. Every change ships unverified, which makes refactors risky and regressions likely."
        : `The repository maintains ${formatCompact(s.testing.testFiles)} test files against ${formatCompact(s.testing.sourceFiles)} source files. A 1:2 ratio is a healthy target for most codebases.`,
      evidence: [
        `test files: ${formatCompact(s.testing.testFiles)}`,
        `source files: ${formatCompact(s.testing.sourceFiles)}`,
        s.testing.frameworks.length > 0 ? `frameworks detected: ${s.testing.frameworks.join(", ")}` : "no test framework detected",
      ],
      recommendation: gap
        ? "Start with a test runner scaffold and characterisation tests on the most-changed modules; wire coverage into CI."
        : "Prioritise integration tests on the highest-traffic paths and add coverage reporting to keep the ratio trending up.",
    });
  }

  /* architecture */
  if (s.arch.oversizedModules.length > 0 || s.stats.maxDepth > 10) {
    const worst = s.arch.oversizedModules[0];
    out.push({
      id: "INS-02",
      tag: "ARCHITECTURE",
      title: "Complexity concentrates in a few large modules",
      explanation: worst
        ? `${worst.path}${worst.exact ? ` holds ${formatCompact(worst.lines ?? 0)} lines` : ` is ${formatCompact(Math.round(worst.bytes / 1024))} KB`}, far beyond a single-responsibility module.`
        : `Directory nesting reaches ${s.stats.maxDepth} levels, which usually indicates layered abstractions.`,
      evidence: [
        worst ? `largest module: ${worst.path}` : `deepest nesting: ${s.stats.maxDepth} levels`,
        `${s.arch.oversizedModules.length} module${s.arch.oversizedModules.length === 1 ? "" : "s"} beyond thresholds`,
      ],
      recommendation: "Extract cohesive sub-modules along responsibility boundaries; keep files under the 600-line review threshold.",
    });
  }

  /* organization */
  out.push({
    id: "INS-03",
    tag: "ORGANIZATION",
    title: s.arch.monorepoWorkspaces ? "Workspace-style monorepo layout" : s.arch.usesSrcDir ? "Conventional src-based layout" : "Flat root layout",
    explanation:
      s.arch.monorepoWorkspaces
        ? "Top-level workspace directories (apps/packages) separate deployables from shared code — good boundaries for tooling and ownership."
        : s.arch.usesSrcDir
          ? "Source lives under src/ with configuration at the root — a familiar, low-surprise structure."
          : "Source files sit directly at the repository root, which blurs the line between code and configuration as the project grows.",
    evidence: [
      ...s.arch.topLevelDirs.slice(0, 4).map((d) => `${d.name}/ — ${formatCompact(d.files)} files`),
      `${s.arch.rootConfigFiles} root config files`,
    ],
    recommendation: s.arch.usesSrcDir || s.arch.monorepoWorkspaces
      ? "Keep boundaries enforced with lint rules on import paths between layers."
      : "Adopt a src/ (or workspaces) layout to separate source from configuration as the codebase grows.",
  });

  /* dependencies */
  if (s.deps.ecosystems.length > 0) {
    out.push({
      id: "INS-04",
      tag: "DEPENDENCIES",
      title: `${formatCompact(s.deps.totalDirect)} direct dependencies across ${s.deps.ecosystems.length} ecosystem${s.deps.ecosystems.length === 1 ? "" : "s"}`,
      explanation: s.deps.hasLockfile
        ? "A lockfile pins the resolved dependency graph, making builds reproducible."
        : "No lockfile was found, so dependency resolution can drift between machines and CI runs.",
      evidence: [
        ...s.deps.ecosystems.filter((e) => e.count > 0).slice(0, 3).map((e) => `${e.name}: ${formatCompact(e.count)} declared in ${e.manifestPath}`),
        s.deps.hasLockfile ? `lockfiles: ${s.deps.lockfiles.join(", ")}` : "no lockfile detected",
      ],
      recommendation: s.deps.hasLockfile
        ? "Keep the lockfile in sync and audit with the ecosystem's built-in tool on a schedule."
        : "Commit a lockfile and gate CI on reproducible installs.",
    });
  }

  /* security posture */
  out.push({
    id: "INS-05",
    tag: "SECURITY",
    title:
      s.security.secretFindings.length > 0 || s.security.committedEnvFiles.length > 0
        ? "Credential hygiene needs attention"
        : "Credential hygiene looks clean",
    explanation:
      s.security.secretFindings.length > 0 || s.security.committedEnvFiles.length > 0
        ? "The scanner found high-confidence credential signals. Values are redacted; review and rotate anything real."
        : "No committed environment files, no high-confidence credential patterns, and no key-like filenames were detected in the inspected set.",
    evidence: [
      `${s.security.secretFindings.length} pattern match${s.security.secretFindings.length === 1 ? "" : "es"} (redacted)`,
      `${s.security.committedEnvFiles.length} committed env file${s.security.committedEnvFiles.length === 1 ? "" : "s"}`,
      s.security.hasSecurityPolicy ? "SECURITY.md present" : "no SECURITY.md",
    ],
    recommendation:
      s.security.secretFindings.length > 0 || s.security.committedEnvFiles.length > 0
        ? "Rotate exposed credentials, purge history, and move to environment-based secret loading."
        : "Add a SECURITY.md disclosure policy and secret scanning in CI to keep it that way.",
  });

  /* documentation */
  out.push({
    id: "INS-06",
    tag: "DOCUMENTATION",
    title: s.docs.readme.present ? "Documentation baseline" : "Documentation starts with a README",
    explanation: s.docs.readme.present
      ? `README (${formatCompact(s.docs.readme.bytes)} bytes), ${s.docs.totalMdFiles} markdown files${s.docs.contributing ? ", a CONTRIBUTING guide" : ""}, and ${s.docs.licenseDeclared ?? (s.docs.licenseFile ? "a license file" : "no declared license")}.`
      : "There is no README, so new contributors have no entry point into the project.",
    evidence: [
      s.docs.readme.present ? `README: ${s.docs.readme.path}` : "no README found",
      `${s.docs.totalMdFiles} markdown files in tree`,
      s.docs.licenseFile ? `license file: ${s.docs.licenseFile}` : "no license file",
    ],
    recommendation: s.docs.readme.present
      ? "Add a CONTRIBUTING guide and architecture notes to shorten onboarding."
      : "Add a README with project purpose, install steps, and a quick-start example.",
  });

  return out;
}

import type { Issue } from "@/lib/types/analysis";
import type { AnalysisContext } from "../context";
import type { StatsSignals } from "../extractors/stats";
import type { DependencySignals } from "../extractors/dependencies";
import type { DocumentationSignals } from "../extractors/docs";
import type { SecuritySignals, SecretFinding } from "../extractors/security";
import type { ArchitectureSignals } from "../extractors/architecture";
import type { TestingSignals } from "../extractors/testing";
import { formatCompact } from "@/lib/utils/format";

/**
 * ISSUE DETECTORS — every finding cites real evidence from the repository.
 * Rules of the house (Phase-2 amendments #5/#10):
 * - Line numbers only when the file content was actually fetched; otherwise
 *   the field is omitted rather than fabricated.
 * - Secret values NEVER appear anywhere — only pattern name + location.
 * - Evidence text is machine-derived (counts, paths, byte sizes).
 */

export interface DetectionInput {
  ctx: AnalysisContext;
  stats: StatsSignals;
  deps: DependencySignals;
  docs: DocumentationSignals;
  security: SecuritySignals;
  arch: ArchitectureSignals;
  testing: TestingSignals;
}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

function buildDetail(d: DetectionInput): Omit<Issue, "id">[] {
  const issues: Omit<Issue, "id">[] = [];

  /* ---- secrets (critical) — grouped by file, values redacted ---- */
  if (d.security.secretFindings.length > 0) {
    const byFile = new Map<string, SecretFinding[]>();
    for (const f of d.security.secretFindings) {
      const list = byFile.get(f.path) ?? [];
      list.push(f);
      byFile.set(f.path, list);
    }
    for (const [path, findings] of [...byFile.entries()].sort()) {
      const first = findings[0];
      issues.push({
        title: "HARDCODED CREDENTIAL PATTERN",
        severity: "critical",
        detail: `A high-confidence credential pattern (${first.pattern}) appears in a committed file. Values are redacted by the scanner — verify manually before acting.`,
        file: path,
        line: first.line,
        evidence: [
          `Pattern: ${first.pattern} — value redacted`,
          `${findings.length} match${findings.length === 1 ? "" : "es"} in this file (line${findings.length === 1 ? ` ${first.line}` : `s ${findings.map((f) => f.line).join(", ")}`})`,
          "Pattern family is limited to well-known token formats to avoid false positives",
        ],
        recommendation: "Revoke and rotate the credential immediately, remove it from the file, and purge it from repository history (e.g. git filter-repo). Load secrets from environment or a secret manager instead.",
      });
    }
  }

  /* ---- committed .env files ---- */
  for (const envPath of d.security.committedEnvFiles.slice(0, 3)) {
    issues.push({
      title: "COMMITTED ENVIRONMENT FILE",
      severity: "high",
      detail: "A live environment file is committed to the repository. Even without confirmed secrets inside, env files frequently drift into containing real values.",
      file: envPath,
      evidence: [
        `${envPath} is present in the default branch tree`,
        ".example/.sample/.template variants are the intended safe alternative",
      ],
      recommendation: "Remove the file from the repository, add it to .gitignore, and commit a .env.example placeholder documenting the expected keys.",
    });
  }

  /* ---- large files ---- */
  for (const m of d.arch.oversizedModules.slice(0, 3)) {
    issues.push({
      title: "LARGE FILE SIZE",
      severity: "high",
      detail: m.exact
        ? `This source module contains ${formatCompact(m.lines ?? 0)} lines, well above the 600-line review threshold.`
        : `This source module is ${formatCompact(Math.round(m.bytes / 1024))} KB (approx. ${formatCompact(m.bytes)} bytes), far above a typical single-module size.`,
      file: m.path,
      fileLineCount: m.exact ? m.lines ?? undefined : undefined,
      evidence: m.exact
        ? [`${formatCompact(m.lines ?? 0)} lines (exact count)`, "exceeds the 600-line single-module threshold"]
        : [`${formatCompact(Math.round(m.bytes / 1024))} KB by tree metadata (content not fetched — line count omitted rather than estimated)`],
      recommendation: "Split the module along its internal responsibilities into smaller, focused units with clear boundaries.",
    });
  }

  /* ---- no tests ---- */
  if (d.stats.sourceFiles >= 20 && d.stats.testFiles === 0) {
    issues.push({
      title: "UNTESTED CODEBASE",
      severity: "high",
      detail: `No test files were found for ${formatCompact(d.stats.sourceFiles)} source files.`,
      evidence: [
        `0 test files · ${formatCompact(d.stats.sourceFiles)} source files`,
        `test directories detected: ${d.testing.testDirectories.length === 0 ? "none" : d.testing.testDirectories.join(", ")}`,
      ],
      recommendation: "Introduce a test runner and start with characterisation tests around the most-changed modules; adopt coverage tracking in CI.",
    });
  }

  /* ---- license ---- */
  if (!d.docs.licenseFile && !d.docs.licenseDeclared) {
    issues.push({
      title: "MISSING LICENSE",
      severity: "medium",
      detail: "No license file or declared license was found. Without one, default copyright applies and potential users cannot legally reuse the code.",
      evidence: ["no LICENSE/LICENCE file at the repository root", "no license declared in repository metadata"],
      recommendation: "Add a LICENSE file using a standard SPDX license that matches your intent (MIT/Apache-2.0 for permissive, GPL for copyleft).",
    });
  }

  /* ---- missing/thin README ---- */
  if (!d.docs.readme.present) {
    issues.push({
      title: "MISSING README",
      severity: "medium",
      detail: "The repository has no README at its root.",
      evidence: ["no README.md/README.rst/README.txt found"],
      recommendation: "Add a README covering what the project does, how to install it, and how to run it.",
    });
  } else if (d.docs.readme.bytes < 500) {
    issues.push({
      title: "THIN README",
      severity: "low",
      detail: `The README is only ${formatCompact(d.docs.readme.bytes)} bytes — likely a stub.`,
      file: d.docs.readme.path ?? undefined,
      evidence: [`README size: ${formatCompact(d.docs.readme.bytes)} bytes`],
      recommendation: "Expand the README with installation, usage, and contribution sections.",
    });
  }

  /* ---- secret-like filenames ---- */
  if (d.security.secretLikeFilenames.length > 0) {
    issues.push({
      title: "SECRET-LIKE FILENAMES",
      severity: "medium",
      detail: "Files whose names suggest credentials or key material are committed to the repository. Contents were not inspected — this is a filename-level signal.",
      file: d.security.secretLikeFilenames[0],
      evidence: d.security.secretLikeFilenames.slice(0, 5).map((p) => p),
      recommendation: "Confirm these are intended (test fixtures are common). If they hold real key material, remove them and rotate the keys.",
    });
  }

  /* ---- deep nesting ---- */
  if (d.arch.deepPaths.count > 0 && d.arch.deepPaths.deepest > 12) {
    issues.push({
      title: "DEEP DIRECTORY NESTING",
      severity: "low",
      detail: `Source paths reach ${d.arch.deepPaths.deepest} directory levels deep, which usually signals layered abstractions or generated structure.`,
      file: d.arch.deepPaths.example ?? undefined,
      evidence: [
        `${d.arch.deepPaths.count} path${d.arch.deepPaths.count === 1 ? "" : "s"} deeper than 12 levels`,
        d.arch.deepPaths.example ? `deepest example: ${d.arch.deepPaths.example}` : "",
      ].filter(Boolean),
      recommendation: "Flatten overly nested hierarchies; group by feature rather than by technical layer where practical.",
    });
  }

  /* ---- god directory (self-relative threshold, justified in architecture.ts) ---- */
  for (const g of d.arch.godDirectories.slice(0, 1)) {
    issues.push({
      title: "GOD DIRECTORY",
      severity: "medium",
      detail: `A single directory holds ${formatCompact(g.immediateFiles)} files — an extreme outlier for this repository (90th percentile of directory sizes is ${g.repoP90}).`,
      file: g.path,
      evidence: [
        `${formatCompact(g.immediateFiles)} files directly in ${g.path}`,
        `repo p90 directory size: ${g.repoP90} files — threshold is max(100, 5×p90)`,
      ],
      recommendation: "Split the directory into cohesive submodules; group by feature or responsibility rather than file type.",
    });
  }

  /* ---- no CI ---- */
  if (d.stats.sourceFiles >= 10 && d.security.ciWorkflows.length === 0) {
    issues.push({
      title: "NO CI PIPELINE",
      severity: "low",
      detail: "No GitHub Actions workflows were found, so nothing verifies commits automatically.",
      evidence: ["0 files under .github/workflows/"],
      recommendation: "Add a CI workflow that at minimum installs dependencies, lints, builds, and runs tests on every push.",
    });
  }

  /* ---- unpinned dependencies ---- */
  if (d.deps.pinnedRatio !== null && d.deps.pinnedRatio < 0.2 && d.deps.totalDirect >= 10 && !d.deps.hasLockfile) {
    issues.push({
      title: "UNPINNED DEPENDENCIES",
      severity: "low",
      detail: "Dependencies use loose version ranges and no lockfile was found, so builds are not reproducible.",
      evidence: [
        `pinning ratio in package.json: ${Math.round(d.deps.pinnedRatio * 100)}%`,
        `no lockfile among: package-lock.json, yarn.lock, pnpm-lock.yaml, …`,
      ],
      recommendation: "Commit a lockfile and pin dependency versions (or use exact ranges for published libraries' runtime deps).",
    });
  }

  return issues;
}

/** Run all detectors, sort deterministically, assign stable IDs. */
export function detectIssues(input: DetectionInput): Issue[] {
  const issues = buildDetail(input);
  issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.title.localeCompare(b.title));
  return issues.slice(0, 24).map((issue, i) => ({ ...issue, id: `ISS-${String(i + 1).padStart(3, "0")}` }));
}

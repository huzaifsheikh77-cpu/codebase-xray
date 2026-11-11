import type { Confidence, Issue, IssueCategory } from "@/lib/types/analysis";
import type { AnalysisContext } from "../context";
import type { QualitySignals } from "../quality";
import type { SecurityRisk } from "../security-rules";
import type { ArchitectureProfile } from "../architecture-profile";
import type { AnalysisCoverage } from "@/lib/types/analysis";
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
  /* --- vNext signals (optional so fixture-based tests stay valid) --- */
  quality?: QualitySignals;
  risks?: SecurityRisk[];
  archProfile?: ArchitectureProfile;
  unresolvedImports?: number;
  coverage?: AnalysisCoverage;
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
      severity: "medium",
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
      severity: "medium",
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

  /* ---- measured code quality (structural, from parsed spans) ---- */
  for (const fn of d.quality?.longFunctions.slice(0, 3) ?? []) {
    issues.push({
      title: "LONG FUNCTION",
      severity: "medium",
      detail: `${fn.name}() spans ${formatCompact(fn.lines)} lines. Long functions usually mix several responsibilities and are hard to test in isolation.`,
      file: fn.path,
      line: fn.line,
      fileLineCount: undefined,
      evidence: [
        `${fn.lines} lines (measured from the parsed function span)`,
        "threshold: 80 lines",
      ],
      recommendation: "Extract cohesive steps into named helpers; keep the public function as orchestration.",
      category: "quality",
      confidence: "verified",
      detectionMethod: "Function span measured by the TypeScript compiler API / indentation parser",
      limitation: "Line count measures size, not difficulty; a long linear function can still be simple.",
      affectedFiles: [fn.path],
    });
  }

  for (const fn of d.quality?.complexFunctions.slice(0, 3) ?? []) {
    issues.push({
      title: "HIGH CYCLOMATIC COMPLEXITY",
      severity: "medium",
      detail: `${fn.name}() has an estimated cyclomatic complexity of ${fn.complexity} (1 + decision points), above the review threshold of 15.`,
      file: fn.path,
      line: fn.line,
      evidence: [
        `complexity ${fn.complexity} measured across the function body`,
        "decision points counted: if / loops / case / catch / ternary / && / || / ??",
      ],
      recommendation: "Split independent decision paths into separate functions and cover each branch with a test.",
      category: "quality",
      confidence: "high",
      detectionMethod: "Decision-point counting over the parsed syntax tree",
      limitation: "A proxy metric — it correlates with, but does not prove, low readability.",
      affectedFiles: [fn.path],
    });
  }

  for (const group of d.quality?.duplicateGroups.slice(0, 2) ?? []) {
    issues.push({
      title: "DUPLICATED CODE BLOCK",
      severity: "low",
      detail: `The same normalised ${group.lines}-line block appears in ${group.files.length} files. Copies drift independently once they stop being edited together.`,
      file: group.files[0],
      evidence: [
        `${group.files.length} files share an identical normalised block (${group.blocks} occurrence${group.blocks === 1 ? "" : "s"})`,
        `files: ${group.files.slice(0, 4).join(", ")}`,
      ],
      recommendation: "Extract the shared block into one module and import it from each site.",
      category: "quality",
      confidence: "heuristic",
      detectionMethod: "Normalised 6-line shingle comparison",
      limitation: "Textual similarity only — semantically different code can normalise to the same block.",
      affectedFiles: group.files,
    });
  }

  /* ---- unresolved internal imports (module boundaries) ---- */
  const unresolved = d.unresolvedImports ?? 0;
  if (unresolved > 0) {
    issues.push({
      title: "UNRESOLVED INTERNAL IMPORTS",
      severity: "low",
      detail: `${formatCompact(unresolved)} internal import${unresolved === 1 ? "" : "s"} could not be mapped to an inspected module, so the graph is incomplete for those edges.`,
      evidence: [
        `${formatCompact(unresolved)} specifier(s) resolved to no node`,
        "causes: path aliases without tsconfig paths, workspace packages outside the sample, generated modules",
      ],
      recommendation: "Declare path aliases in tsconfig.json and ensure workspace packages are inspectable so the graph can resolve them.",
      category: "architecture",
      confidence: "high",
      detectionMethod: "Import specifiers parsed then matched against the module node set",
      limitation: "Edges are omitted, never invented; an unresolved import may reference a file outside the inspected sample.",
    });
  }

  /* ---- security risk patterns (each carries verification advice) ---- */
  for (const risk of d.risks?.slice(0, 6) ?? []) {
    issues.push({
      title: risk.title,
      severity: risk.severity,
      detail: `${risk.detail} ${risk.consequence}`,
      file: risk.path,
      line: risk.line,
      evidence: [
        `rule ${risk.ruleId} matched at ${risk.path}:${risk.line}`,
        `verification: ${risk.verification}`,
      ],
      recommendation: risk.recommendation,
      category: "security",
      confidence: risk.confidence,
      detectionMethod: "Pattern matching over fetched content (no taint analysis)",
      limitation: "A pattern match is an indicator, not a confirmed vulnerability. No data-flow analysis was performed.",
      affectedFiles: [risk.path],
    });
  }

  return issues;
}

/**
 * Category / confidence / method for detectors that predate the evidence
 * model. Anything a detector sets explicitly wins over this table.
 */
const ISSUE_META: Record<string, { category: IssueCategory; confidence: Confidence; detectionMethod: string; limitation?: string }> = {
  "HARDCODED CREDENTIAL PATTERN": {
    category: "security",
    confidence: "high",
    detectionMethod: "Known-token-format regex over fetched content; values redacted and discarded",
    limitation: "May be a documentation example or fixture; the value is never retained for confirmation.",
  },
  "COMMITTED ENVIRONMENT FILE": {
    category: "security",
    confidence: "verified",
    detectionMethod: "Tree inspection of committed filenames",
    limitation: "Proves the file is committed, not that it contains live secrets.",
  },
  "LARGE FILE SIZE": {
    category: "quality",
    confidence: "high",
    detectionMethod: "Exact line count when fetched, tree byte size otherwise",
    limitation: "Size alone is a review signal, not a defect in itself.",
  },
  "UNTESTED CODEBASE": {
    category: "testing",
    confidence: "high",
    detectionMethod: "Test-file classification over the eligible tree",
    limitation: "Tests outside conventional naming/tree patterns are not detected.",
  },
  "MISSING LICENSE": {
    category: "documentation",
    confidence: "verified",
    detectionMethod: "Root tree inspection plus repository metadata",
  },
  "MISSING README": {
    category: "documentation",
    confidence: "verified",
    detectionMethod: "Root tree inspection",
  },
  "THIN README": {
    category: "documentation",
    confidence: "verified",
    detectionMethod: "Byte size of the fetched README",
    limitation: "Length is not quality; a short README can still be complete.",
  },
  "SECRET-LIKE FILENAMES": {
    category: "security",
    confidence: "heuristic",
    detectionMethod: "Filename pattern match (contents not necessarily inspected)",
    limitation: "Filename-only signal; fixtures and public keys are common false positives.",
  },
  "DEEP DIRECTORY NESTING": {
    category: "architecture",
    confidence: "heuristic",
    detectionMethod: "Path depth distribution",
    limitation: "Deep nesting is a style signal; some generated layouts require it.",
  },
  "GOD DIRECTORY": {
    category: "architecture",
    confidence: "high",
    detectionMethod: "Directory size relative to the repository's own p90",
    limitation: "A large directory can be intentional (e.g. a fixture corpus).",
  },
  "NO CI PIPELINE": {
    category: "maintainability",
    confidence: "verified",
    detectionMethod: "Presence check for .github/workflows/*.yml in the tree",
    limitation: "CI on another platform (GitLab, Jenkins, CircleCI config elsewhere) is not detected.",
  },
  "UNPINNED DEPENDENCIES": {
    category: "dependencies",
    confidence: "high",
    detectionMethod: "Version-range parsing of the root npm manifest",
    limitation: "Lockfile detection covers common filenames only.",
  },
};

/** Run all detectors, sort deterministically, assign stable IDs and evidence metadata. */
export function detectIssues(input: DetectionInput): Issue[] {
  const issues = buildDetail(input);
  issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.title.localeCompare(b.title));
  return issues.slice(0, 30).map((issue, i) => {
    const meta = ISSUE_META[issue.title];
    return {
      ...meta,
      ...issue,
      id: `ISS-${String(i + 1).padStart(3, "0")}`,
    };
  });
}

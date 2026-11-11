import type { Band, Confidence, Sector } from "@/lib/types/analysis";
import { formatCompact } from "@/lib/utils/format";
import type { DetectionInput } from "../issues/detectors";
import { clamp } from "./overall";
import {
  ARCHITECTURE_WEIGHTS,
  CODE_QUALITY_WEIGHTS,
  DEPENDENCY_CEILING,
  DOCUMENTATION_POINTS,
  MAINTAINABILITY_WEIGHTS,
  SECURITY_BONUSES,
  SECURITY_PENALTIES,
  SMALL_REPO_MIN_LOC,
  SMALL_REPO_MIN_SOURCES,
  TESTING_RATIO_TARGET,
  TESTING_WEIGHTS,
} from "./weights";

export type AllSignals = DetectionInput;

function bandOf(value: number): Band {
  if (value >= 85) return "excellent";
  if (value >= 70) return "good";
  if (value >= 50) return "fair";
  if (value >= 30) return "weak";
  return "critical";
}

function sector(
  id: Sector["id"],
  label: string,
  value: number,
  explanation: string,
  confidence: Confidence,
): Sector {
  const rounded = Math.round(clamp(value, 0, 100));
  return { id, label, score: { value: rounded, band: bandOf(rounded) }, explanation, confidence };
}

/**
 * Small-repo damping: pull the score toward the 50 midpoint by a factor
 * based on how little evidence exists. Applied to every sector so that
 * absence of evidence is never mistaken for excellence.
 */
function damp(value: number, stats: AllSignals["stats"]): number {
  const evidence = Math.min(
    1,
    (stats.sourceFiles / SMALL_REPO_MIN_SOURCES) * 0.5 + (stats.linesOfCode / SMALL_REPO_MIN_LOC) * 0.5,
  );
  return 50 + (value - 50) * (0.4 + 0.6 * evidence);
}

/** How much of a claim this sector rests on. */
function confidenceOf(s: AllSignals): Confidence {
  const inspectedPct = s.coverage?.inspectedPct ?? 100;
  if (s.stats.sourceFiles === 0 && s.stats.linesOfCode === 0) return "incomplete";
  if (inspectedPct >= 99 && s.stats.sourceFiles >= SMALL_REPO_MIN_SOURCES) return "high";
  if (inspectedPct >= 99) return "heuristic";
  return "heuristic";
}

function neutral(id: Sector["id"], label: string, reason: string): Sector {
  return sector(id, label, 50, `Insufficient evidence — ${reason}. Neutral score, not a positive result.`, "incomplete");
}

export function scoreCodeQuality(s: AllSignals): Sector {
  const { stats, arch, quality } = s;
  if (stats.sourceFiles === 0 && stats.linesOfCode === 0) {
    return neutral("code_quality", "CODE QUALITY", "no source files were inspected");
  }

  const oversizedRatio = stats.sourceFiles > 0 ? arch.oversizedModules.length / stats.sourceFiles : 0;
  const largestLoc = stats.largestFiles[0]?.loc ?? 0;
  const largestShare = stats.linesOfCode > 0 ? largestLoc / stats.linesOfCode : 0;
  const todoCount = countTodos(s);
  const todoDensity = stats.exactLocFiles > 0 ? todoCount / Math.max(1, stats.exactLocFiles) : 0;

  const longFunctions = quality?.longFunctions.length ?? 0;
  const complexFunctions = quality?.complexFunctions.length ?? 0;
  const measuredPenalty = quality && quality.functionsMeasured > 0
    ? Math.min(CODE_QUALITY_WEIGHTS.measuredFunctions, longFunctions * 2 + complexFunctions * 2)
    : 0;

  const value =
    100 -
    CODE_QUALITY_WEIGHTS.oversizedRatio * Math.min(1, oversizedRatio * 8) -
    CODE_QUALITY_WEIGHTS.largestFileShare * Math.min(1, largestShare * 3) -
    measuredPenalty -
    CODE_QUALITY_WEIGHTS.todoDensity * Math.min(1, todoDensity * 10) -
    CODE_QUALITY_WEIGHTS.nesting * Math.min(1, arch.deepPaths.deepest / 20);

  const parts: string[] = [
    `${formatCompact(stats.linesOfCode)} LOC across ${formatCompact(stats.sourceFiles)} source files`,
    `${arch.oversizedModules.length} oversized module${arch.oversizedModules.length === 1 ? "" : "s"} beyond the 600-line threshold`,
  ];
  if (quality && quality.functionsMeasured > 0) {
    parts.push(
      `${formatCompact(quality.functionsMeasured)} functions measured · ${longFunctions} long · ${complexFunctions} high-complexity`,
    );
  } else {
    parts.push("no function metrics available in the inspected sample");
  }
  if (todoCount > 0) parts.push(`${formatCompact(todoCount)} TODO/FIXME markers in inspected files`);

  return sector("code_quality", "CODE QUALITY", damp(value, stats), parts.join(" · ") + ".", confidenceOf(s));
}

export function scoreSecurity(s: AllSignals): Sector {
  const { security, deps, risks } = s;
  if (s.stats.sourceFiles === 0 && s.ctx.entries.length === 0) {
    return neutral("security", "SECURITY", "nothing was inspected");
  }

  // Absence of detected patterns is not proof of security. Start below 100
  // so a clean scan reads as "no findings", not "verified secure".
  let value = 82;
  const notes: string[] = [];

  const envPenalty = Math.min(SECURITY_PENALTIES.committedEnvCap, security.committedEnvFiles.length * SECURITY_PENALTIES.committedEnvFile);
  if (envPenalty > 0) {
    value -= envPenalty;
    notes.push(`${security.committedEnvFiles.length} committed .env file${security.committedEnvFiles.length === 1 ? "" : "s"}`);
  }
  const secretPenalty = Math.min(SECURITY_PENALTIES.secretFindingsCap, security.secretFindings.length * SECURITY_PENALTIES.secretFinding);
  if (secretPenalty > 0) {
    value -= secretPenalty;
    notes.push(`${security.secretFindings.length} high-confidence credential pattern${security.secretFindings.length === 1 ? "" : "s"} (values redacted)`);
  }
  const namePenalty = Math.min(SECURITY_PENALTIES.secretLikeFilenamesCap, security.secretLikeFilenames.length * SECURITY_PENALTIES.secretLikeFilename);
  if (namePenalty > 0) {
    value -= namePenalty;
    notes.push(`${security.secretLikeFilenames.length} secret-like filename${security.secretLikeFilenames.length === 1 ? "" : "s"}`);
  }
  const riskCount = risks?.length ?? 0;
  if (riskCount > 0) {
    const riskPenalty = Math.min(SECURITY_PENALTIES.riskFindingsCap, riskCount * SECURITY_PENALTIES.riskFinding);
    value -= riskPenalty;
    notes.push(`${riskCount} risk-pattern finding${riskCount === 1 ? "" : "s"} (paired with verification steps)`);
  }
  if (security.hasSecurityPolicy) value += SECURITY_BONUSES.securityPolicy;
  if (deps.hasLockfile) value += SECURITY_BONUSES.lockfile;
  if (s.docs.envExample) value += SECURITY_BONUSES.envExample;
  if (notes.length === 0) {
    notes.push("no committed env files, no credential patterns, no suspicious key files — this is not a security audit");
  }

  return sector("security", "SECURITY", damp(value, s.stats), notes.join(" · ") + ".", confidenceOf(s));
}

export function scoreTesting(s: AllSignals): Sector {
  const { testing } = s;
  if (s.stats.sourceFiles === 0) return neutral("testing", "TESTING", "no source files were inspected");

  const ratio = testing.ratio ?? 0;
  const ratioScore = Math.min(1, ratio / TESTING_RATIO_TARGET) * 100;
  const value =
    TESTING_WEIGHTS.coverageRatio * (ratioScore / 100) +
    (testing.frameworks.length > 0 ? TESTING_WEIGHTS.framework : 0) +
    (testing.configFiles.length > 0 ? TESTING_WEIGHTS.config : 0);

  const parts = [
    `${formatCompact(testing.testFiles)} test files for ${formatCompact(testing.sourceFiles)} source files`,
    testing.frameworks.length > 0 ? `frameworks: ${testing.frameworks.join(", ")}` : "no test framework detected",
    "file ratio only — no coverage percentage is inferred",
  ];
  return sector("testing", "TESTING", damp(value, s.stats), parts.join(" · ") + ".", confidenceOf(s));
}

export function scoreArchitecture(s: AllSignals): Sector {
  const { arch } = s;
  if (s.stats.sourceFiles === 0) return neutral("architecture", "ARCHITECTURE", "no source files were inspected");

  const oversizedPressure = Math.min(1, (arch.oversizedModules.length / Math.max(1, s.stats.sourceFiles)) * 8);
  const nestingPressure = Math.min(1, Math.max(0, arch.deepPaths.deepest - 12) / 10);
  const unresolved = s.unresolvedImports ?? 0;
  const boundaryPenalty = Math.min(1, unresolved / Math.max(5, s.stats.sourceFiles * 2));

  const value =
    ARCHITECTURE_WEIGHTS.organization * ((arch.usesSrcDir ? 0.75 : 0.6) + (arch.monorepoWorkspaces ? 0.25 : 0.15)) +
    ARCHITECTURE_WEIGHTS.oversizedPressure * (1 - oversizedPressure) +
    ARCHITECTURE_WEIGHTS.nesting * (1 - nestingPressure) +
    ARCHITECTURE_WEIGHTS.godDirs * (arch.godDirectories.length > 0 ? 0 : 1) +
    ARCHITECTURE_WEIGHTS.boundaries * (1 - boundaryPenalty);

  const parts = [
    arch.monorepoWorkspaces ? "workspace-style layout" : arch.usesSrcDir ? "src-based layout" : "flat root layout",
    `${formatCompact(arch.oversizedModules.length)} oversized module${arch.oversizedModules.length === 1 ? "" : "s"}`,
  ];
  if (arch.godDirectories.length > 0) parts.push(`${arch.godDirectories.length} god director${arch.godDirectories.length === 1 ? "y" : "ies"}`);
  if (unresolved > 0) parts.push(`${formatCompact(unresolved)} unresolved internal import${unresolved === 1 ? "" : "s"}`);

  return sector("architecture", "ARCHITECTURE", damp(value, s.stats), parts.join(" · ") + ".", confidenceOf(s));
}

export function scoreDocumentation(s: AllSignals): Sector {
  const { docs } = s;
  if (s.ctx.entries.length === 0) return neutral("documentation", "DOCUMENTATION", "nothing was inspected");

  let value = 0;
  const parts: string[] = [];

  if (docs.readme.present && docs.readme.bytes >= 500) {
    value += DOCUMENTATION_POINTS.readmeFull;
    parts.push(`README present (${formatCompact(docs.readme.bytes)} bytes)`);
  } else if (docs.readme.present) {
    value += DOCUMENTATION_POINTS.readmeStub;
    parts.push("README is a stub");
  } else {
    parts.push("no README");
  }
  if (docs.contributing) {
    value += DOCUMENTATION_POINTS.contributing;
    parts.push("CONTRIBUTING guide");
  }
  if (docs.licenseFile || docs.licenseDeclared) {
    value += DOCUMENTATION_POINTS.license;
    parts.push(`license: ${docs.licenseDeclared ?? "file"}`);
  } else {
    parts.push("no license");
  }
  if (docs.docsDirectory) {
    value += DOCUMENTATION_POINTS.docsDirectory;
    parts.push("docs/ directory");
  }
  if (docs.apiDocs.length > 0) {
    value += DOCUMENTATION_POINTS.apiDocs;
    parts.push(`${docs.apiDocs.length} API schema file${docs.apiDocs.length === 1 ? "" : "s"}`);
  }
  if (docs.envExample) {
    value += DOCUMENTATION_POINTS.envExample;
    parts.push(".env.example documents config");
  }
  if (docs.securityPolicy) {
    value += DOCUMENTATION_POINTS.securityPolicy;
    parts.push("SECURITY.md");
  }
  if (docs.totalMdFiles >= 10) {
    value += DOCUMENTATION_POINTS.richMarkdown;
    parts.push(`${formatCompact(docs.totalMdFiles)} markdown files`);
  }
  parts.push("existence and size only — prose quality is not measured");

  // Damping matters most here: a tiny repo with no docs previously scored 0.
  return sector("documentation", "DOCUMENTATION", damp(value, s.stats), parts.join(" · ") + ".", confidenceOf(s));
}

export function scoreMaintainability(s: AllSignals): Sector {
  const { deps, stats, security } = s;
  if (stats.sourceFiles === 0 && stats.linesOfCode === 0) {
    return neutral("maintainability", "MAINTAINABILITY", "no source files were inspected");
  }

  const depLoad = Math.max(0, 1 - deps.totalDirect / DEPENDENCY_CEILING);
  const largestLoc = stats.largestFiles[0]?.loc ?? 0;
  const spread = stats.linesOfCode > 0 ? 1 - largestLoc / stats.linesOfCode : 1;
  const pinned = deps.pinnedRatio ?? (deps.hasLockfile ? 1 : 0.5);

  const value =
    MAINTAINABILITY_WEIGHTS.dependencyLoad * depLoad +
    MAINTAINABILITY_WEIGHTS.ciAutomation * (security.ciWorkflows.length > 0 ? 1 : 0) +
    MAINTAINABILITY_WEIGHTS.fileSpread * Math.min(1, spread * 2) +
    MAINTAINABILITY_WEIGHTS.lockfile * (deps.hasLockfile ? 1 : 0) +
    MAINTAINABILITY_WEIGHTS.pinning * pinned;

  const parts = [
    deps.totalDirect > 0 ? `${formatCompact(deps.totalDirect)} direct dependencies across ${deps.ecosystems.length} ecosystem${deps.ecosystems.length === 1 ? "" : "s"}` : "no dependency manifests found",
    security.ciWorkflows.length > 0 ? `${security.ciWorkflows.length} CI workflow${security.ciWorkflows.length === 1 ? "" : "s"}` : "no CI",
    deps.hasLockfile ? "lockfile present" : "no lockfile",
  ];
  return sector("maintainability", "MAINTAINABILITY", damp(value, stats), parts.join(" · ") + ".", confidenceOf(s));
}

function countTodos(s: AllSignals): number {
  let count = 0;
  for (const [, content] of s.ctx.fetched) {
    if (content.length > 200_000) continue;
    const m = content.match(/\b(TODO|FIXME|HACK)\b/g);
    if (m) count += m.length;
  }
  return count;
}

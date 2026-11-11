import type { RepoAnalysis, SectorId, Severity } from "@/lib/types/analysis";

/**
 * Full boundary validation for the browser-supplied analysis.
 *
 * This is intentionally stricter than a TypeScript type: it enforces finite
 * numbers, bounded strings/arrays, valid paths and known enum values. It is
 * the only gate between untrusted JSON and buildRepoBrief()/the model.
 */

const MAX_ISSUES = 30;
const MAX_INSIGHTS = 50;
const MAX_TREE_NODES = 4_000;
const MAX_GRAPH_NODES = 500;
const MAX_GRAPH_EDGES = 1_000;
const MAX_EVIDENCE = 20;
const MAX_STRING = 8_000;

const SECTOR_IDS: SectorId[] = [
  "code_quality",
  "security",
  "testing",
  "architecture",
  "documentation",
  "maintainability",
];
const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finite(value: unknown, min = -Infinity, max = Infinity): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function str(value: unknown, max = MAX_STRING): value is string {
  return typeof value === "string" && value.length <= max;
}

function safePath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 300) return false;
  if (value.startsWith("/") || value.includes("\\") || value.includes("\0")) return false;
  return !value.split("/").some((part) => part === "..");
}

function stringArray(value: unknown, maxItems: number, maxLen: number): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((v) => str(v, maxLen));
}

function validScore(value: unknown): boolean {
  return isRecord(value) && finite(value.value, 0, 100) && str(value.band, 20);
}

function validTree(nodes: unknown, budget: { left: number }): boolean {
  if (!Array.isArray(nodes) || nodes.length > MAX_TREE_NODES) return false;
  for (const node of nodes) {
    if (budget.left-- <= 0 || !isRecord(node)) return false;
    if (typeof node.name !== "string" || !safePath(node.path) || (node.type !== "file" && node.type !== "dir")) {
      return false;
    }
    if (node.loc !== undefined && !finite(node.loc, 0, 10_000_000)) return false;
    if (node.children !== undefined && !validTree(node.children, budget)) return false;
  }
  return true;
}

export function validateAnalysisForAi(value: unknown): { ok: true; analysis: RepoAnalysis } | { ok: false; reason: string } {
  if (!isRecord(value)) return { ok: false, reason: "analysis must be an object" };
  const repo = value.repo;
  const meta = value.analysis;
  const score = value.score;
  const structure = value.structure;
  const graph = value.graph;

  if (!isRecord(repo) || !str(repo.slug, 200) || !str(repo.description, 5_000)) {
    return { ok: false, reason: "repo metadata is incomplete" };
  }
  if (
    !str(repo.url, 500) ||
    !str(repo.owner, 100) ||
    !str(repo.name, 100) ||
    !str(repo.defaultBranch, 200) ||
    !str(repo.license, 100) ||
    !str(repo.createdAt, 80) ||
    !str(repo.pushedAt, 80) ||
    !finite(repo.stars, 0, 1e9) ||
    !finite(repo.forks, 0, 1e9) ||
    !finite(repo.openIssues, 0, 1e9)
  ) {
    return { ok: false, reason: "repo metadata has invalid fields" };
  }

  if (
    !isRecord(meta) ||
    !str(meta.generatedAt, 80) ||
    !str(meta.engineVersion, 80) ||
    !str(meta.scanId, 120) ||
    !finite(meta.durationMs, 0, 3_600_000) ||
    typeof meta.isDemoData !== "boolean" ||
    (meta.warnings !== undefined && !stringArray(meta.warnings, 20, 500)) ||
    (meta.partial !== undefined && typeof meta.partial !== "boolean")
  ) {
    return { ok: false, reason: "analysis metadata has invalid fields" };
  }
  if (meta.aiToken !== undefined && !str(meta.aiToken, 300)) {
    return { ok: false, reason: "invalid analysis token" };
  }
  if (meta.coverage !== undefined) {
    const c = meta.coverage;
    if (
      !isRecord(c) ||
      !finite(c.inspectedFiles, 0, 1e7) ||
      !finite(c.eligibleFiles, 0, 1e7) ||
      !finite(c.inspectedPct, 0, 100) ||
      !finite(c.parsedFiles, 0, 1e7) ||
      !finite(c.parseFailures, 0, 1e7) ||
      !finite(c.unresolvedImports, 0, 1e7) ||
      typeof c.truncated !== "boolean"
    ) {
      return { ok: false, reason: "coverage has invalid fields" };
    }
  }

  if (!isRecord(score) || !validScore(score.overall) || !Array.isArray(score.sectors) || score.sectors.length !== 6) {
    return { ok: false, reason: "score requires exactly six sectors" };
  }
  for (const sector of score.sectors) {
    if (
      !isRecord(sector) ||
      !SECTOR_IDS.includes(sector.id as SectorId) ||
      !str(sector.label, 100) ||
      !validScore(sector.score) ||
      !str(sector.explanation, 2_000)
    ) {
      return { ok: false, reason: "sector has invalid fields" };
    }
  }

  if (!isRecord(structure) || !isRecord(structure.stats) || !Array.isArray(structure.languages)) {
    return { ok: false, reason: "structure is incomplete" };
  }
  const stats = structure.stats;
  for (const key of ["totalFiles", "linesOfCode", "testFiles"] as const) {
    if (!finite(stats[key], 0, 1e8)) return { ok: false, reason: `structure.stats.${key} is invalid` };
  }
  if (structure.languages.length > 20) return { ok: false, reason: "too many languages" };
  for (const language of structure.languages) {
    if (!isRecord(language) || !str(language.name, 100) || !finite(language.pct, 0, 100)) {
      return { ok: false, reason: "language has invalid fields" };
    }
  }
  if (!Array.isArray(structure.fileTree) || !validTree(structure.fileTree, { left: MAX_TREE_NODES })) {
    return { ok: false, reason: "file tree is invalid or too large" };
  }

  if (
    !isRecord(graph) ||
    !Array.isArray(graph.nodes) ||
    graph.nodes.length > MAX_GRAPH_NODES ||
    !Array.isArray(graph.edges) ||
    graph.edges.length > MAX_GRAPH_EDGES
  ) {
    return { ok: false, reason: "graph is invalid or too large" };
  }
  for (const node of graph.nodes) {
    if (!isRecord(node) || !str(node.id, 300) || !str(node.label, 300) || !str(node.kind, 40)) {
      return { ok: false, reason: "graph node is invalid" };
    }
  }
  for (const edge of graph.edges) {
    if (!isRecord(edge) || !str(edge.from, 300) || !str(edge.to, 300)) {
      return { ok: false, reason: "graph edge is invalid" };
    }
  }

  if (!Array.isArray(value.issues) || value.issues.length > MAX_ISSUES) {
    return { ok: false, reason: "issues are invalid or too many" };
  }
  for (const issue of value.issues) {
    if (
      !isRecord(issue) ||
      !str(issue.id, 40) ||
      !str(issue.title, 200) ||
      !SEVERITIES.includes(issue.severity as Severity) ||
      !str(issue.detail, 5_000) ||
      (issue.file !== undefined && !safePath(issue.file)) ||
      (issue.line !== undefined && !finite(issue.line, 1, 10_000_000)) ||
      (issue.evidence !== undefined && !stringArray(issue.evidence, MAX_EVIDENCE, 1_000)) ||
      (issue.affectedFiles !== undefined && !stringArray(issue.affectedFiles, 100, 300))
    ) {
      return { ok: false, reason: "issue has invalid fields" };
    }
  }

  if (!Array.isArray(value.insights) || value.insights.length > MAX_INSIGHTS) {
    return { ok: false, reason: "insights are invalid or too many" };
  }
  for (const insight of value.insights) {
    if (
      !isRecord(insight) ||
      !str(insight.id, 40) ||
      !str(insight.title, 300) ||
      !str(insight.explanation, 5_000) ||
      !str(insight.recommendation, 3_000) ||
      (insight.evidence !== undefined && !stringArray(insight.evidence, MAX_EVIDENCE, 1_000))
    ) {
      return { ok: false, reason: "insight has invalid fields" };
    }
  }

  if (!Array.isArray(value.system) || value.system.length > 10) {
    return { ok: false, reason: "system status is invalid" };
  }
  for (const service of value.system) {
    if (!isRecord(service) || !str(service.id, 40) || !str(service.label, 100) || !str(service.version, 200)) {
      return { ok: false, reason: "system service is invalid" };
    }
  }

  return { ok: true, analysis: value as unknown as RepoAnalysis };
}

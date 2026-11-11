import type { RepoAnalysis, TreeNode } from "@/lib/types/analysis";
import type { RepoBrief } from "./types";

/**
 * CONTEXT BUILDER.
 *
 * The model receives a *projection* of the deterministic analysis: counts,
 * scores, findings and the paths those findings cite. It never receives the
 * repository, source files, tokens or the GitHub client. This keeps prompts
 * small, private and impossible to hallucinate file contents from.
 */

const MAX_ISSUES = 12;
const MAX_EVIDENCE_LINES = 3;
const MAX_KNOWN_PATHS = 400;

function flattenPaths(nodes: TreeNode[], out: string[], cap: number): void {
  for (const node of nodes) {
    if (out.length >= cap) return;
    if (node.type === "file") out.push(node.path);
    else if (node.children) flattenPaths(node.children, out, cap);
  }
}

export function buildRepoBrief(analysis: RepoAnalysis): RepoBrief {
  const paths = new Set<string>();
  for (const issue of analysis.issues) {
    if (issue.file) paths.add(issue.file);
    for (const p of issue.affectedFiles ?? []) paths.add(p);
  }
  const treePaths: string[] = [];
  flattenPaths(analysis.structure.fileTree, treePaths, MAX_ISSUES * 10);

  const knownPaths = [...new Set([...paths, ...treePaths])].slice(0, MAX_KNOWN_PATHS);

  return {
    repo: {
      slug: analysis.repo.slug,
      description: analysis.repo.description.slice(0, 300),
      defaultBranch: analysis.repo.defaultBranch,
      stars: analysis.repo.stars,
      license: analysis.repo.license,
      pushedAt: analysis.repo.pushedAt,
    },
    scan: {
      engineVersion: analysis.analysis.engineVersion,
      scoringVersion: analysis.analysis.scoringVersion,
      isDemoData: analysis.analysis.isDemoData,
      partial: Boolean(analysis.analysis.partial),
      warnings: (analysis.analysis.warnings ?? []).slice(0, 6),
      coverage: analysis.analysis.coverage
        ? {
            inspectedFiles: analysis.analysis.coverage.inspectedFiles,
            eligibleFiles: analysis.analysis.coverage.eligibleFiles,
            inspectedPct: analysis.analysis.coverage.inspectedPct,
            parsedFiles: analysis.analysis.coverage.parsedFiles,
            unresolvedImports: analysis.analysis.coverage.unresolvedImports,
          }
        : undefined,
    },
    stats: {
      totalFiles: analysis.structure.stats.totalFiles,
      linesOfCode: analysis.structure.stats.linesOfCode,
      // Regression: this previously reported exactLocFiles (files with an
      // exact line count) as "sourceFiles", overstating the corpus the model
      // was told about.
      sourceFiles: analysis.structure.stats.sourceFiles ?? analysis.structure.stats.exactLocFiles ?? 0,
      testFiles: analysis.structure.stats.testFiles,
      languages: analysis.structure.languages.slice(0, 6).map((l) => ({ name: l.name, pct: l.pct })),
    },
    scores: {
      overall: analysis.score.overall.value,
      sectors: analysis.score.sectors.map((s) => ({
        id: s.id,
        label: s.label,
        value: s.score.value,
        confidence: s.confidence,
        explanation: s.explanation.slice(0, 240),
      })),
    },
    architecture: {
      pattern: analysis.structure.architectureProfile?.pattern,
      confidence: analysis.structure.architectureProfile?.confidence,
      evidence: (analysis.structure.architectureProfile?.evidence ?? []).slice(0, 5),
      topDirectories: analysis.graph.nodes
        .filter((n) => n.kind !== "external")
        .slice(0, 10)
        .map((n) => n.label),
      modules: analysis.graph.nodes.slice(0, 16).map((n) => ({ id: n.id, label: n.label, kind: n.kind })),
      edgeCount: analysis.graph.edges.length,
      unresolvedImports: analysis.graph.unresolvedImports ?? 0,
    },
    issues: analysis.issues.slice(0, MAX_ISSUES).map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      category: i.category,
      confidence: i.confidence,
      file: i.file,
      line: i.line,
      detail: i.detail.slice(0, 400),
      evidence: (i.evidence ?? []).slice(0, MAX_EVIDENCE_LINES).map((e) => e.slice(0, 200)),
      recommendation: i.recommendation?.slice(0, 300),
    })),
    knownPaths,
  };
}

/** Render the brief as compact text for the prompt (≈1 token per 4 chars). */
export function renderBrief(b: RepoBrief): string {
  const lines: string[] = [];
  lines.push(`REPOSITORY: ${b.repo.slug} — ${b.repo.description || "(no description)"}`);
  lines.push(`BRANCH: ${b.repo.defaultBranch} · STARS: ${b.repo.stars} · LICENSE: ${b.repo.license}`);
  lines.push(
    `SCAN: ${b.scan.engineVersion}${b.scan.scoringVersion ? ` · ${b.scan.scoringVersion}` : ""} · DEMO=${b.scan.isDemoData} · PARTIAL=${b.scan.partial}`,
  );
  if (b.scan.coverage) {
    lines.push(
      `COVERAGE: ${b.scan.coverage.inspectedFiles}/${b.scan.coverage.eligibleFiles} eligible files (${b.scan.coverage.inspectedPct}%) · parsed=${b.scan.coverage.parsedFiles} · unresolved imports=${b.scan.coverage.unresolvedImports}`,
    );
  }
  for (const w of b.scan.warnings) lines.push(`WARNING: ${w}`);
  lines.push(
    `STATS: files=${b.stats.totalFiles} loc=${b.stats.linesOfCode} tests=${b.stats.testFiles} languages=${b.stats.languages.map((l) => `${l.name} ${l.pct}%`).join(", ")}`,
  );
  lines.push(`OVERALL SCORE: ${b.scores.overall}/100 (heuristic, versioned)`);
  for (const s of b.scores.sectors) {
    lines.push(`SECTOR ${s.label}: ${s.value}/100 [confidence=${s.confidence ?? "unknown"}] — ${s.explanation}`);
  }
  lines.push(
    `ARCHITECTURE: ${b.architecture.pattern ?? "undetermined"} [confidence=${b.architecture.confidence ?? "incomplete"}] · modules=${b.architecture.modules.length} · edges=${b.architecture.edgeCount}`,
  );
  for (const e of b.architecture.evidence) lines.push(`ARCH EVIDENCE: ${e}`);
  lines.push("FINDINGS:");
  for (const i of b.issues) {
    lines.push(
      `- [${i.id}] ${i.title} · ${i.severity.toUpperCase()} · category=${i.category ?? "unknown"} · confidence=${i.confidence ?? "unknown"} · file=${i.file ?? "(repo-wide)"}${i.line ? `:${i.line}` : ""}`,
    );
    lines.push(`  detail: ${i.detail}`);
    for (const e of i.evidence) lines.push(`  evidence: ${e}`);
    if (i.recommendation) lines.push(`  suggestion: ${i.recommendation}`);
  }
  lines.push(`CITABLE PATHS (never invent others): ${b.knownPaths.slice(0, 80).join(", ") || "(none)"}`);
  return lines.join("\n");
}

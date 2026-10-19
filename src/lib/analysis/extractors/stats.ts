import type { AnalysisContext } from "../context";
import { languageInfoOrFallback } from "../languages";
import { classifyPath, pathDepth } from "../tree-utils";

export interface LanguageStat {
  name: string;
  pct: number;
  loc: number;
  fileCount: number;
  color: string;
}

export interface StatsSignals {
  totalFiles: number;
  analyzedFiles: number;
  linesOfCode: number;
  exactLocFiles: number;
  estimatedLocFiles: number;
  languages: LanguageStat[];
  largestFiles: { path: string; bytes: number; loc: number; exact: boolean }[];
  maxDepth: number;
  sourceFiles: number;
  testFiles: number;
  sourceTestRatio: number | null;
}

/**
 * LOC is exact for fetched files, estimated from blob byte size for the
 * rest (bytes ÷ per-language bytes-per-line). Both paths are deterministic.
 */
export function extractStats(ctx: AnalysisContext): StatsSignals {
  let linesOfCode = 0;
  let exactLocFiles = 0;
  let estimatedLocFiles = 0;
  let maxDepth = 0;

  const byLanguage = new Map<string, { loc: number; files: number; color: string }>();
  const largest: { path: string; bytes: number; loc: number; exact: boolean }[] = [];
  let sourceFiles = 0;
  let testFiles = 0;

  for (const entry of ctx.entries) {
    const path = entry.path;
    const depth = pathDepth(path);
    if (depth > maxDepth) maxDepth = depth;

    const kind = classifyPath(path);
    if (kind === "source") sourceFiles++;
    else if (kind === "test") testFiles++;

    const info = languageInfoOrFallback(path);
    const content = ctx.fetched.get(path);
    const loc = content !== undefined ? content.split("\n").length : Math.max(1, Math.round((entry.size ?? 0) / info.bytesPerLine));
    if (content !== undefined) exactLocFiles++;
    else estimatedLocFiles++;

    linesOfCode += loc;
    largest.push({ path, bytes: entry.size ?? 0, loc, exact: content !== undefined });

    // non-source extensions roll into "Other"-style buckets by extension family
    const langName = info.name;
    const bucket = byLanguage.get(langName) ?? { loc: 0, files: 0, color: info.color };
    bucket.loc += loc;
    bucket.files += 1;
    byLanguage.set(langName, bucket);
  }

  const languages: LanguageStat[] = [...byLanguage.entries()]
    .map(([name, b]) => ({
      name,
      loc: b.loc,
      fileCount: b.files,
      color: b.color,
      pct: linesOfCode > 0 ? Math.round((b.loc / linesOfCode) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.loc - a.loc || a.name.localeCompare(b.name))
    .slice(0, 8);

  largest.sort((a, b) => b.bytes - a.bytes || (a.path < b.path ? -1 : 1));
  const topLargest = largest.slice(0, 8);

  return {
    totalFiles: ctx.allEntries.reduce((n, e) => (e.type === "blob" ? n + 1 : n), 0),
    analyzedFiles: ctx.entries.length,
    linesOfCode,
    exactLocFiles,
    estimatedLocFiles,
    languages,
    largestFiles: topLargest,
    maxDepth,
    sourceFiles,
    testFiles,
    sourceTestRatio: sourceFiles > 0 ? Math.round((testFiles / sourceFiles) * 100) / 100 : null,
  };
}

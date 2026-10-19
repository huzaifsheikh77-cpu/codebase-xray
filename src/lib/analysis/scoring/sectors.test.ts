import { describe, expect, it } from "vitest";
import type { AnalysisContext } from "../context";
import type { GitHubTreeEntry } from "@/lib/github/endpoints";
import { extractStats } from "../extractors/stats";
import { extractDependencies } from "../extractors/dependencies";
import { extractTesting } from "../extractors/testing";
import { extractDocumentation } from "../extractors/docs";
import { extractSecurity } from "../extractors/security";
import { extractArchitecture } from "../extractors/architecture";
import { scoreCodeQuality, scoreSecurity, scoreTesting } from "./sectors";
import { overallScore } from "./overall";

function entry(path: string, size: number): GitHubTreeEntry {
  return { path, mode: "100644", type: "blob", size, sha: path };
}

function makeCtx(entries: GitHubTreeEntry[], files: Record<string, string> = {}): AnalysisContext {
  return {
    repo: {
      owner: "o", name: "r", description: "", defaultBranch: "main",
      stars: 0, forks: 0, openIssues: 0, licenseSpdx: null,
      createdAt: "2024-01-01T00:00:00Z", pushedAt: "2026-01-01T00:00:00Z", sizeKb: 10,
    },
    allEntries: entries,
    entries,
    treeTruncated: false,
    fetched: new Map(Object.entries(files)),
    degraded: false,
    warnings: [],
    rateLimit: null,
  };
}

const sourceFiles = (n: number, lines = 100): [string, string][] =>
  Array.from({ length: n }, (_, i) => {
    const path = `src/mod${i}.ts`;
    const content = Array.from({ length: lines }, (_, j) => `const a${j} = ${j};`).join("\n");
    return [path, content] as [string, string];
  });

function buildSignals(ctx: AnalysisContext) {
  const stats = extractStats(ctx);
  const deps = extractDependencies(ctx);
  const testing = extractTesting(ctx, deps);
  const docs = extractDocumentation(ctx);
  const security = extractSecurity(ctx, deps);
  const arch = extractArchitecture(ctx);
  return { ctx, stats, deps, docs, security, arch, testing };
}

describe("scoring", () => {
  it("is deterministic — same input, same scores", () => {
    const files = Object.fromEntries(sourceFiles(25));
    const entries = Object.keys(files).map((p) => entry(p, files[p].length));
    const a = scoreCodeQuality(buildSignals(makeCtx(entries, files)));
    const b = scoreCodeQuality(buildSignals(makeCtx(entries, files)));
    expect(a).toEqual(b);
  });

  it("every sector score is bounded 0–100", () => {
    const files = Object.fromEntries(sourceFiles(30, 900));
    const entries = Object.keys(files).map((p) => entry(p, files[p].length));
    const sig = buildSignals(makeCtx(entries, files));
    for (const s of [scoreCodeQuality(sig), scoreSecurity(sig), scoreTesting(sig)]) {
      expect(s.score.value).toBeGreaterThanOrEqual(0);
      expect(s.score.value).toBeLessThanOrEqual(100);
    }
  });

  it("committed .env files push security down measurably", () => {
    const files = Object.fromEntries(sourceFiles(25));
    const entries = Object.keys(files).map((p) => entry(p, files[p].length));
    const clean = scoreSecurity(buildSignals(makeCtx(entries, files))).score.value;

    const ctxBad = makeCtx(entries, { ...files, ".env": "A=1" });
    ctxBad.allEntries = [...ctxBad.allEntries, entry(".env", 20)];
    const dirty = scoreSecurity(buildSignals(ctxBad)).score.value;

    expect(dirty).toBeLessThan(clean);
    expect(clean - dirty).toBeGreaterThanOrEqual(20);
  });

  it("damps tiny repositories toward the middle", () => {
    const files = Object.fromEntries(sourceFiles(3, 40)); // tiny repo, big files ratio-wise
    const entries = Object.keys(files).map((p) => entry(p, files[p].length));
    const sig = buildSignals(makeCtx(entries, files));
    const tiny = scoreCodeQuality(sig).score.value;

    const bigFiles = Object.fromEntries(sourceFiles(60, 40));
    const bigEntries = Object.keys(bigFiles).map((p) => entry(p, bigFiles[p].length));
    const bigSig = buildSignals(makeCtx(bigEntries, bigFiles));
    const big = scoreCodeQuality(bigSig).score.value;

    // tiny repo should sit closer to 50 than the big repo's score
    expect(Math.abs(tiny - 50)).toBeLessThanOrEqual(Math.abs(big - 50) + 1);
  });

  it("overall is a weighted mean within bounds", () => {
    const result = overallScore([
      { id: "code_quality", label: "CQ", score: { value: 90, band: "excellent" }, explanation: "" },
      { id: "security", label: "SEC", score: { value: 50, band: "fair" }, explanation: "" },
      { id: "testing", label: "T", score: { value: 40, band: "weak" }, explanation: "" },
      { id: "architecture", label: "A", score: { value: 80, band: "good" }, explanation: "" },
      { id: "documentation", label: "D", score: { value: 70, band: "good" }, explanation: "" },
      { id: "maintainability", label: "M", score: { value: 60, band: "fair" }, explanation: "" },
    ]);
    expect(result.value).toBeGreaterThan(50);
    expect(result.value).toBeLessThan(90);
  });
});

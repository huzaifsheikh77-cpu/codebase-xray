import { describe, expect, it } from "vitest";
import { InvalidAiResponse, parseAnswer } from "./validate";
import type { RepoBrief } from "./types";

function brief(): RepoBrief {
  return {
    repo: {
      slug: "o/r",
      description: "fixture",
      defaultBranch: "main",
      stars: 1,
      license: "MIT",
      pushedAt: "2026-01-01T00:00:00Z",
    },
    scan: { engineVersion: "xray.engine v3.0.0", isDemoData: false, partial: false, warnings: [] },
    stats: { totalFiles: 2, linesOfCode: 10, sourceFiles: 2, testFiles: 0, languages: [] },
    scores: { overall: 50, sectors: [] },
    architecture: {
      pattern: "flat",
      confidence: "heuristic",
      evidence: [],
      topDirectories: [],
      modules: [],
      edgeCount: 0,
      unresolvedImports: 0,
    },
    issues: [
      {
        id: "ISS-001",
        title: "LARGE FILE SIZE",
        severity: "high",
        category: "quality",
        confidence: "high",
        file: "src/a.ts",
        line: 3,
        detail: "big",
        evidence: ["e"],
        recommendation: "split",
      },
    ],
    knownPaths: ["src/a.ts"],
  };
}

function answer(citations: unknown): string {
  return JSON.stringify({
    summary: "A summary",
    explanation: "An explanation grounded in the brief.",
    citations,
    confidence: "high",
    limitations: ["sampled"],
    suggestedActions: ["split the module"],
  });
}

describe("parseAnswer", () => {
  it("keeps citations that reference real evidence", () => {
    const { answer: parsed, rejectedCitations } = parseAnswer(
      answer([{ issueId: "ISS-001", path: "src/a.ts", line: 3 }]),
      brief(),
    );
    expect(rejectedCitations).toBe(0);
    expect(parsed.citations).toHaveLength(1);
    expect(parsed.citations[0].issueId).toBe("ISS-001");
  });

  it("drops invented file paths and finding ids", () => {
    const { answer: parsed, rejectedCitations } = parseAnswer(
      answer([
        { path: "src/invented.ts" },
        { issueId: "ISS-999" },
        { issueId: "ISS-001" },
        { note: "no reference at all" },
      ]),
      brief(),
    );
    expect(rejectedCitations).toBe(3);
    expect(parsed.citations).toHaveLength(1);
    expect(parsed.citations[0].issueId).toBe("ISS-001");
  });

  it("strips markdown fences and rejects non-JSON", () => {
    const fenced = "```json\n" + answer([{ issueId: "ISS-001" }]) + "\n```";
    expect(parseAnswer(fenced, brief()).answer.summary).toBe("A summary");
    expect(() => parseAnswer("not json at all", brief())).toThrow(InvalidAiResponse);
  });

  it("forces confidence into the allowed vocabulary", () => {
    const payload = JSON.parse(answer([])) as Record<string, unknown>;
    payload.confidence = "certain";
    expect(parseAnswer(JSON.stringify(payload), brief()).answer.confidence).toBe("low");
  });

  it("rejects an empty answer rather than showing nothing", () => {
    expect(() =>
      parseAnswer(JSON.stringify({ summary: "", explanation: "", citations: [] }), brief()),
    ).toThrow(InvalidAiResponse);
  });

  it("clamps oversized fields", () => {
    const payload = JSON.parse(answer([])) as Record<string, unknown>;
    payload.explanation = "x".repeat(10_000);
    expect(parseAnswer(JSON.stringify(payload), brief()).answer.explanation.length).toBe(2_400);
  });
});

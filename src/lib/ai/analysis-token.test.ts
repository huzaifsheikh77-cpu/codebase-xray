import { afterEach, describe, expect, it, vi } from "vitest";
import { MOCK_ANALYSIS } from "@/lib/mock/repo-analysis";
import { createAnalysisToken, verifyAnalysisToken } from "./analysis-token";

const original = process.env.AI_ANALYSIS_SECRET;

afterEach(() => {
  vi.restoreAllMocks();
  if (original === undefined) delete process.env.AI_ANALYSIS_SECRET;
  else process.env.AI_ANALYSIS_SECRET = original;
});

describe("analysis binding token", () => {
  it("verifies the exact analysis payload and rejects tampering", () => {
    process.env.AI_ANALYSIS_SECRET = "test-analysis-secret";
    const analysis = structuredClone(MOCK_ANALYSIS);
    const token = createAnalysisToken(analysis);
    expect(token).toMatch(/^v1\./);
    expect(verifyAnalysisToken(analysis, token)).toBe(true);

    const tampered = structuredClone(analysis);
    tampered.issues[0].detail = "fabricated finding";
    expect(verifyAnalysisToken(tampered, token)).toBe(false);
  });

  it("cannot be reused with a different scan", () => {
    process.env.AI_ANALYSIS_SECRET = "test-analysis-secret";
    const a = structuredClone(MOCK_ANALYSIS);
    const token = createAnalysisToken(a);
    const b = structuredClone(MOCK_ANALYSIS);
    b.analysis.scanId = "CX-OTHER";
    expect(verifyAnalysisToken(b, token)).toBe(false);
  });

  it("expires after fifteen minutes", () => {
    process.env.AI_ANALYSIS_SECRET = "test-analysis-secret";
    const now = 1_800_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const analysis = structuredClone(MOCK_ANALYSIS);
    const token = createAnalysisToken(analysis);
    expect(verifyAnalysisToken(analysis, token)).toBe(true);
    vi.spyOn(Date, "now").mockReturnValue(now + 15 * 60_000 + 1);
    expect(verifyAnalysisToken(analysis, token)).toBe(false);
  });

  it("is not single-use: the same payload can be replayed within its TTL", () => {
    process.env.AI_ANALYSIS_SECRET = "test-analysis-secret";
    const analysis = structuredClone(MOCK_ANALYSIS);
    const token = createAnalysisToken(analysis);
    expect(verifyAnalysisToken(analysis, token)).toBe(true);
    expect(verifyAnalysisToken(analysis, token)).toBe(true);
  });

  it("rejects a token signed with a different secret and malformed tokens", () => {
    process.env.AI_ANALYSIS_SECRET = "test-analysis-secret";
    const analysis = structuredClone(MOCK_ANALYSIS);
    const token = createAnalysisToken(analysis);
    process.env.AI_ANALYSIS_SECRET = "rotated-secret";
    expect(verifyAnalysisToken(analysis, token)).toBe(false);
    process.env.AI_ANALYSIS_SECRET = "test-analysis-secret";
    expect(verifyAnalysisToken(analysis, "not-a-token")).toBe(false);
    expect(verifyAnalysisToken(analysis, "v1.9999999999999.deadbeef")).toBe(false);
  });
});

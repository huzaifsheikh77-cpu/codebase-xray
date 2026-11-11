import { describe, expect, it } from "vitest";
import { MOCK_ANALYSIS } from "@/lib/mock/repo-analysis";
import { validateAnalysisForAi } from "./request-schema";

describe("validateAnalysisForAi", () => {
  it("accepts the full analysis contract", () => {
    expect(validateAnalysisForAi(structuredClone(MOCK_ANALYSIS)).ok).toBe(true);
  });

  it("rejects missing nested fields instead of reaching context construction", () => {
    const value = structuredClone(MOCK_ANALYSIS) as unknown as { score: { sectors?: unknown } };
    delete value.score.sectors;
    expect(validateAnalysisForAi(value)).toMatchObject({ ok: false });
  });

  it("rejects non-finite numbers", () => {
    const value = structuredClone(MOCK_ANALYSIS);
    value.score.overall.value = Number.NaN;
    expect(validateAnalysisForAi(value).ok).toBe(false);
  });

  it("rejects path traversal and unsafe paths", () => {
    const value = structuredClone(MOCK_ANALYSIS);
    value.issues[0].file = "../../etc/passwd";
    expect(validateAnalysisForAi(value).ok).toBe(false);
  });

  it("rejects excessive issue arrays and oversized fields", () => {
    const tooMany = structuredClone(MOCK_ANALYSIS);
    tooMany.issues = Array.from({ length: 31 }, () => structuredClone(MOCK_ANALYSIS.issues[0]));
    expect(validateAnalysisForAi(tooMany).ok).toBe(false);

    const long = structuredClone(MOCK_ANALYSIS);
    long.issues[0].detail = "x".repeat(5_001);
    expect(validateAnalysisForAi(long).ok).toBe(false);
  });
});

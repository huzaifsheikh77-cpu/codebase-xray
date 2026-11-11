// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CoverageSection } from "./coverage-section";
import { MOCK_ANALYSIS } from "@/lib/mock/repo-analysis";
import type { RepoAnalysis } from "@/lib/types/analysis";

afterEach(cleanup);

function withCoverage(overrides: Partial<NonNullable<RepoAnalysis["analysis"]["coverage"]>>): RepoAnalysis {
  return {
    ...MOCK_ANALYSIS,
    analysis: {
      ...MOCK_ANALYSIS.analysis,
      coverage: { ...MOCK_ANALYSIS.analysis.coverage!, ...overrides },
    },
  };
}

describe("CoverageSection", () => {
  it("shows the real inspected percentage and declared warnings", () => {
    const analysis = withCoverage({ inspectedPct: 9.5, inspectedFiles: 20, eligibleFiles: 210 });
    analysis.analysis.warnings = ["SAMPLED COVERAGE — 20 OF 210 ELIGIBLE FILES READ (9.52%)"];
    render(<CoverageSection analysis={analysis} />);
    expect(screen.getByText("9.5%")).toBeTruthy();
    expect(screen.getByText(/SAMPLED COVERAGE/)).toBeTruthy();
  });

  it("discloses critical categories that were not fully inspected", () => {
    render(
      <CoverageSection
        analysis={withCoverage({
          critical: [{ category: "auth", discovered: 2, inspected: 0 }],
        })}
      />,
    );
    expect(screen.getByText("CRITICAL PATH COVERAGE")).toBeTruthy();
    expect(screen.getByText("0 / 2 FILES")).toBeTruthy();
  });

  it("never claims coverage when the payload has none", () => {
    const analysis: RepoAnalysis = { ...MOCK_ANALYSIS, analysis: { ...MOCK_ANALYSIS.analysis, coverage: undefined } };
    render(<CoverageSection analysis={analysis} />);
    expect(screen.getByText(/DOES NOT REPORT COVERAGE/i)).toBeTruthy();
  });
});

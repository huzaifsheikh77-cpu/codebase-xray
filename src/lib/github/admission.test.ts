import { describe, expect, it } from "vitest";
import { canAdmitScan, estimateGitHubRequests, GITHUB_SAFETY_RESERVE } from "./admission";

describe("GitHub admission control", () => {
  it("scales the estimate with repository size and caps it", () => {
    expect(estimateGitHubRequests({ size: 1 })).toBeGreaterThanOrEqual(7);
    expect(estimateGitHubRequests({ size: 1_000_000 })).toBeLessThanOrEqual(163);
  });

  it("refuses a scan when the safety reserve would be consumed", () => {
    expect(canAdmitScan(200, 100)).toBe(true);
    expect(canAdmitScan(124, 100)).toBe(false);
    expect(canAdmitScan(100 + GITHUB_SAFETY_RESERVE - 1, 100)).toBe(false);
  });
});

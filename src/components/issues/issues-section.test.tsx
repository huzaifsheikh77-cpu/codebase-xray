// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { IssuesSection } from "./issues-section";
import { MOCK_ANALYSIS } from "@/lib/mock/repo-analysis";

afterEach(cleanup);

describe("IssuesSection", () => {
  it("renders a meaningful empty state instead of crashing on zero findings", () => {
    render(<IssuesSection issues={[]} />);
    expect(screen.getByText(/NO FINDINGS IN THE INSPECTED SAMPLE/i)).toBeTruthy();
    expect(screen.getByText(/not proof that the repository is problem-free/i)).toBeTruthy();
  });

  it("renders a finding with its evidence and file", () => {
    const issue = MOCK_ANALYSIS.issues[0];
    render(<IssuesSection issues={[issue]} />);
    expect(screen.getAllByText(issue.title).length).toBeGreaterThan(0);
    expect(screen.getByText(issue.detail)).toBeTruthy();
    if (issue.file) expect(screen.getAllByText(issue.file).length).toBeGreaterThan(0);
  });
});

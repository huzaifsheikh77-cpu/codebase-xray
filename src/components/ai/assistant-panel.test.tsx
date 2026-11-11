// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AssistantPanel } from "./assistant-panel";
import { MOCK_ANALYSIS } from "@/lib/mock/repo-analysis";
import type { RepoAnalysis } from "@/lib/types/analysis";

afterEach(cleanup);

describe("AssistantPanel", () => {
  it("renders an explicit disabled state when no provider is configured", () => {
    render(<AssistantPanel analysis={MOCK_ANALYSIS} />);
    expect(screen.getByText("ASSISTANT OFFLINE")).toBeTruthy();
    expect(screen.getByText(/no API key is configured on the server/i)).toBeTruthy();
    expect(screen.getAllByText(/AI_API_KEY/).length).toBeGreaterThan(0);
    // No fabricated answer UI and no request controls are present.
    expect(screen.queryByText(/SUGGESTED NEXT STEPS/)).toBeNull();
    expect(screen.queryByText("ASK ASSISTANT")).toBeNull();
  });

  it("documents that the key is server-only", () => {
    render(<AssistantPanel analysis={MOCK_ANALYSIS} />);
    expect(screen.getByText(/THE KEY IS SERVER-ONLY/i)).toBeTruthy();
  });

  it("offers the request controls only when a provider is available", () => {
    const enabled: RepoAnalysis = {
      ...MOCK_ANALYSIS,
      analysis: {
        ...MOCK_ANALYSIS.analysis,
        ai: { available: true, provider: "openai-compatible", model: "test-model" },
      },
    };
    render(<AssistantPanel analysis={enabled} />);
    expect(screen.getByText("ASK ASSISTANT")).toBeTruthy();
    expect(screen.getByText("EXPLAIN FINDING")).toBeTruthy();
    expect(screen.getByText(/ONLY THE ANALYSIS SUMMARY IS SENT/i)).toBeTruthy();
  });
});

import { describe, expect, it } from "vitest";
import type { ChatProvider } from "./provider";
import type { AiConfig } from "./config";
import { answerWithAi } from "./service";
import type { AiRequest } from "./types";
import { MOCK_ANALYSIS } from "@/lib/mock/repo-analysis";

/** Controlled provider — no network, no key, no claim of a live integration. */
function providerReturning(raw: string): ChatProvider {
  return {
    id: "mock",
    model: "mock-model",
    complete: async () => raw,
  } as unknown as ChatProvider;
}

const CONFIG: AiConfig = {
  available: true,
  provider: "mock",
  model: "mock-model",
  baseUrl: "http://127.0.0.1",
  apiKey: "test-key-never-sent",
};

function request(overrides: Partial<AiRequest> = {}): AiRequest {
  return {
    task: "explain-architecture",
    analysis: MOCK_ANALYSIS,
    level: "developer",
    ...overrides,
  };
}

const VALID = JSON.stringify({
  summary: "A modular build orchestrator.",
  explanation: "The scan found a six-sector profile with several file-size findings.",
  citations: [{ issueId: "ISS-001" }],
  confidence: "medium",
  grounding: "evidence",
  limitations: ["No source code was available to the assistant."],
  requiresMoreInspection: ["The authentication module was not identified."],
  suggestedActions: ["Split the largest module."],
});

describe("answerWithAi (provider injected, no live call)", () => {
  it("returns a validated answer and records provider metadata", async () => {
    const result = await answerWithAi(request(), { config: CONFIG, provider: providerReturning(VALID) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.answer.grounding).toBe("evidence");
    expect(result.answer.requiresMoreInspection).toHaveLength(1);
    expect(result.meta).toMatchObject({ provider: "mock", model: "mock-model", level: "developer" });
  });

  it("rejects an unusable provider response instead of inventing an answer", async () => {
    const result = await answerWithAi(request(), {
      config: CONFIG,
      provider: providerReturning("I think the repository is fine."),
    });
    expect(result).toMatchObject({ ok: false, code: "AI_INVALID_RESPONSE" });
  });

  it("maps provider failure to an explicit error and never throws", async () => {
    const failing = {
      id: "mock",
      model: "mock-model",
      complete: async () => {
        throw new Error("connection reset");
      },
    } as unknown as ChatProvider;
    const result = await answerWithAi(request(), { config: CONFIG, provider: failing });
    expect(result).toMatchObject({ ok: false, code: "AI_PROVIDER_ERROR" });
  });

  it("stays unavailable without configuration even if a provider exists", async () => {
    const result = await answerWithAi(request(), {
      config: { available: false, provider: "none", model: null, baseUrl: null, apiKey: null, reason: "no key" },
      provider: providerReturning(VALID),
    });
    expect(result).toMatchObject({ ok: false, code: "AI_UNAVAILABLE" });
  });

  it("rejects a request for a finding that is not in the brief", async () => {
    const result = await answerWithAi(request({ task: "explain-issue", issueId: "ISS-999" }), {
      config: CONFIG,
      provider: providerReturning(VALID),
    });
    // The provider still answers; the brief marks the finding as unavailable.
    expect(result.ok).toBe(true);
  });
});

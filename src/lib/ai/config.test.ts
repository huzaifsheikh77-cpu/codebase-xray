import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiPublicStatus, readAiConfig } from "./config";

const ORIGINAL = { ...process.env };

describe("AI public status", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL };
    delete process.env.VERCEL_ENV;
    delete process.env.AI_PUBLIC_ENABLED;
    delete process.env.AI_DISABLED;
    delete process.env.AI_ANALYSIS_SECRET;
    process.env.AI_API_KEY = "test-only-key";
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    process.env = { ...ORIGINAL };
    vi.unstubAllEnvs();
  });

  it("reports unavailable on a hosted deployment without explicit opt-in", () => {
    process.env.VERCEL_ENV = "preview";
    expect(aiPublicStatus()).toMatchObject({
      available: false,
      provider: "none",
      reason: expect.stringContaining("AI_PUBLIC_ENABLED"),
    });
  });

  it("reports unavailable when the emergency switch is set", () => {
    process.env.AI_DISABLED = "1";
    process.env.AI_PUBLIC_ENABLED = "1";
    expect(aiPublicStatus()).toMatchObject({
      available: false,
      reason: expect.stringContaining("AI_DISABLED"),
    });
  });

  it("reports unavailable in production without an analysis binding secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(readAiConfig()).toMatchObject({
      available: false,
      reason: expect.stringContaining("AI_ANALYSIS_SECRET"),
    });
    expect(aiPublicStatus().available).toBe(false);
  });

  it("stays available locally when a key is present", () => {
    expect(readAiConfig()).toMatchObject({ available: true, provider: "openai-compatible" });
    expect(aiPublicStatus()).toMatchObject({ available: true });
  });
});

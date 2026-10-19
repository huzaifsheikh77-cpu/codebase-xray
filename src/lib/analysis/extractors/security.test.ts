import { describe, expect, it } from "vitest";
import type { AnalysisContext } from "../context";
import { extractSecurity } from "./security";

function makeCtx(files: Record<string, string>, extra: Partial<AnalysisContext> = {}): AnalysisContext {
  const allEntries = Object.entries(files).map(([path]) => ({
    path,
    mode: "100644",
    type: "blob" as const,
    size: files[path].length,
    sha: path,
  }));
  return {
    repo: {
      owner: "o",
      name: "r",
      description: "",
      defaultBranch: "main",
      stars: 0,
      forks: 0,
      openIssues: 0,
      licenseSpdx: null,
      createdAt: "2024-01-01T00:00:00Z",
      pushedAt: "2026-01-01T00:00:00Z",
      sizeKb: 10,
    },
    allEntries,
    entries: allEntries,
    treeTruncated: false,
    fetched: new Map(Object.entries(files)),
    degraded: false,
    warnings: [],
    rateLimit: null,
    ...extra,
  };
}

describe("extractSecurity", () => {
  it("detects a committed .env file but not .env.example", () => {
    const sig = extractSecurity(
      makeCtx({ ".env": "X=1", ".env.example": "X=", "src/a.ts": "1" }),
      { ecosystems: [], hasLockfile: false, lockfiles: [], pinnedRatio: null, totalDirect: 0 } as never,
    );
    expect(sig.committedEnvFiles).toEqual([".env"]);
  });

  it("detects an AWS key with exact line number", () => {
    // Assembled at runtime so the fixture never resembles a real credential
    // to repository secret scanners; it is AWS's documented example key.
    const exampleKey = ["AKIA", "IOSFODNN7EXAMPLE"].join("");
    const content = ["line1", `aws_key = ${exampleKey}`, "line3"].join("\n");
    const sig = extractSecurity(makeCtx({ "scripts/deploy.sh": content }), {} as never);
    expect(sig.secretFindings).toHaveLength(1);
    expect(sig.secretFindings[0].line).toBe(2);
    expect(sig.secretFindings[0].pattern).toBe("AWS Access Key ID");
  });

  it("NEVER stores the matched secret value (redaction contract)", () => {
    // Exactly 36 chars after the prefix, assembled at runtime so the test
    // fixture is not a literal token-shaped string in source control.
    const secret = ["ghp", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij"].join("_");
    const sig = extractSecurity(makeCtx({ "a.ts": `const t = "${secret}";` }), {} as never);
    expect(sig.secretFindings).toHaveLength(1);
    const serialized = JSON.stringify(sig);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("ghp_");
  });

  it("flags secret-like filenames", () => {
    const sig = extractSecurity(makeCtx({ "config/id_rsa": "", "certs/server.pem": "" }), {} as never);
    expect(sig.secretLikeFilenames).toEqual(["certs/server.pem", "config/id_rsa"]);
  });

  it("ignores generic password-ish strings (conservative, low FP)", () => {
    const sig = extractSecurity(makeCtx({ "a.ts": 'password = "hunter2hunter2hunter2!"' }), {} as never);
    expect(sig.secretFindings).toHaveLength(0);
  });
});

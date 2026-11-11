import { describe, expect, it } from "vitest";
import { classifyCritical, criticalCoverage, criticalCoverageWarnings } from "./critical";

describe("classifyCritical", () => {
  it("classifies security-sensitive paths", () => {
    expect(classifyCritical("src/auth/session.ts")?.category).toBe("auth");
    expect(classifyCritical("src/api/users/route.ts")?.category).toBe("api");
    expect(classifyCritical("src/db/users.ts")?.category).toBe("data");
    expect(classifyCritical("prisma/schema.prisma")?.category).toBe("data");
    expect(classifyCritical(".github/workflows/ci.yml")?.category).toBe("security-config");
    expect(classifyCritical(".env")?.category).toBe("security-config");
    expect(classifyCritical("index.js")?.category).toBe("entry");
    expect(classifyCritical("tests/users.test.ts")?.category).toBe("test");
  });

  it("does not classify ordinary UI or docs files", () => {
    expect(classifyCritical("src/components/button.tsx")).toBeNull();
    expect(classifyCritical("README.md")).toBeNull();
    expect(classifyCritical("docs/architecture.md")).toBeNull();
  });

  it("does not treat a deep index file as an entry point", () => {
    expect(classifyCritical("packages/a/src/deep/nested/index.ts")?.category).not.toBe("entry");
  });
});

describe("criticalCoverage", () => {
  const eligible = [
    "src/auth/session.ts",
    "src/auth/token.ts",
    "src/api/users.ts",
    "src/db/users.ts",
    "src/components/button.tsx",
  ];

  it("reports discovered vs inspected per category", () => {
    const coverage = criticalCoverage(eligible, new Set(["src/auth/session.ts", "src/api/users.ts"]));
    expect(coverage).toContainEqual({ category: "auth", discovered: 2, inspected: 1 });
    expect(coverage).toContainEqual({ category: "api", discovered: 1, inspected: 1 });
    expect(coverage).toContainEqual({ category: "data", discovered: 1, inspected: 0 });
    // categories with no discovered files are omitted, not reported as 100%
    expect(coverage.some((c) => c.category === "entry")).toBe(false);
  });

  it("warns only for security-sensitive categories that were partly inspected", () => {
    const warnings = criticalCoverageWarnings(
      criticalCoverage(eligible, new Set(["src/auth/session.ts", "src/api/users.ts"])),
    );
    expect(warnings.some((w) => w.includes("AUTH"))).toBe(true);
    expect(warnings.some((w) => w.includes("DATA"))).toBe(true);
    expect(warnings).toHaveLength(2); // api fully inspected; auth and data were not
  });

  it("stays silent when every discovered critical file was inspected", () => {
    expect(criticalCoverageWarnings(criticalCoverage(eligible, new Set(eligible)))).toEqual([]);
  });
});

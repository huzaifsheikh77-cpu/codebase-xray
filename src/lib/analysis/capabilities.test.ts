import { describe, expect, it } from "vitest";
import { LANGUAGE_CAPABILITIES, capabilityFor, tallyCapabilities } from "./capabilities";
import { registeredParsers } from "./parsers/registry";

describe("language capabilities", () => {
  it("never advertises more depth than the parser implements", () => {
    const astParsers = new Set(registeredParsers().filter((p) => p.ast).map((p) => p.id));
    for (const capability of LANGUAGE_CAPABILITIES) {
      if (capability.level === "full") {
        expect(astParsers.has(capability.parser), capability.language).toBe(true);
        expect(capability.functions).toBe(true);
      }
      if (capability.level === "import-only") {
        expect(capability.functions).toBe(false);
        expect(capability.complexity).toBe(false);
      }
    }
  });

  it("resolves the capability for a path through the parser registry", () => {
    expect(capabilityFor("src/a.ts")?.level).toBe("full");
    expect(capabilityFor("pkg/main.py")?.level).toBe("partial");
    expect(capabilityFor("cmd/main.go")?.level).toBe("import-only");
    expect(capabilityFor("README.md")).toBeNull();
  });

  it("tallies inspected files by depth without counting docs as unsupported", () => {
    const tally = tallyCapabilities(["src/a.ts", "src/b.ts", "pkg/main.py", "cmd/main.go", "README.md", "data.bin"]);
    expect(tally.full).toBe(2);
    expect(tally.partial).toBe(1);
    expect(tally["import-only"]).toBe(1);
    expect(tally.unsupported).toBe(0); // README/docs are not source; .bin is filtered upstream
  });
});

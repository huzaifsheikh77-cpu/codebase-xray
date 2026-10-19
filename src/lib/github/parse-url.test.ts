import { describe, expect, it } from "vitest";
import { parseRepoUrl } from "./parse-url";

describe("parseRepoUrl", () => {
  const ok = [
    ["https://github.com/vercel/next.js", { owner: "vercel", repo: "next.js" }],
    ["http://github.com/facebook/react", { owner: "facebook", repo: "react" }],
    ["github.com/microsoft/vscode", { owner: "microsoft", repo: "vscode" }],
    ["www.github.com/nodejs/node", { owner: "nodejs", repo: "node" }],
    ["https://github.com/tailwindlabs/tailwindcss/", { owner: "tailwindlabs", repo: "tailwindcss" }],
    ["https://github.com/evanw/esource.git", { owner: "evanw", repo: "esource" }],
    ["https://github.com/evanw/esource.git/", { owner: "evanw", repo: "esource" }],
    ["vercel/next.js", { owner: "vercel", repo: "next.js" }],
    ["https://github.com/facebook/react/tree/main/packages", { owner: "facebook", repo: "react" }],
    ["https://github.com/facebook/react/blob/main/README.md", { owner: "facebook", repo: "react" }],
  ] as const;

  for (const [input, expected] of ok) {
    it(`accepts ${input}`, () => {
      expect(parseRepoUrl(input)).toEqual(expected);
    });
  }

  const bad = [
    "",
    "not a url",
    "https://gitlab.com/foo/bar",
    "https://github.com/",
    "https://github.com/owner",
    "https://github.com/-badowner/repo",
    "https://github.com/bad_owner/repo",
    "https://github.com/owner/.git",
    "https://user:pass@github.com/owner/repo",
    "https://github.com/owner/repo/issues/123",
    "https://github.com/owner/repo?tab=readme",
    "owner/repo/extra/deep",
  ];

  for (const input of bad) {
    it(`rejects "${input}"`, () => {
      expect(parseRepoUrl(input)).toBeNull();
    });
  }
});

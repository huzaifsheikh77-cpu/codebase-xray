import type { RepoAnalysis } from "@/lib/types/analysis";

/**
 * MOCK ANALYSIS — nebula-labs/orbit-forge
 *
 * A clearly fictional repository ("a fictional open-source build
 * orchestrator"). Every metric below is invented for the demo; the UI
 * labels it DEMO DATA / SIMULATED ANALYSIS via `analysis.isDemoData`.
 *
 * When the real engine lands it will produce the same `RepoAnalysis`
 * object and this file stops being imported — no UI changes required.
 */
export const MOCK_ANALYSIS: RepoAnalysis = {
  repo: {
    url: "https://github.com/nebula-labs/orbit-forge",
    slug: "nebula-labs/orbit-forge",
    owner: "nebula-labs",
    name: "orbit-forge",
    description: "A fictional open-source build orchestrator.",
    defaultBranch: "main",
    stars: 2417,
    forks: 186,
    openIssues: 47,
    license: "MIT",
    createdAt: "2024-06-12T09:24:00Z",
    pushedAt: "2026-09-28T16:41:00Z",
  },
  analysis: {
    generatedAt: "2026-10-06T10:12:00Z",
    engineVersion: "xray.engine v2.7.3",
    durationMs: 6140,
    scanId: "CX-0007",
    isDemoData: true,
  },
  score: {
    overall: { value: 82, band: "good" },
    sectors: [
      {
        id: "code_quality",
        label: "CODE QUALITY",
        score: { value: 88, band: "excellent" },
        explanation:
          "91.4% type coverage, low duplication. Complexity concentrates in a few oversized modules.",
      },
      {
        id: "security",
        label: "SECURITY",
        score: { value: 61, band: "fair" },
        explanation:
          "One hardcoded credential pattern flagged; two dependency advisories await upgrades.",
      },
      {
        id: "testing",
        label: "TESTING",
        score: { value: 74, band: "good" },
        explanation:
          "68 test files cover core flows; the scheduler and CLI layers remain under-tested.",
      },
      {
        id: "architecture",
        label: "ARCHITECTURE",
        score: { value: 84, band: "excellent" },
        explanation:
          "Clean workspace boundaries. One circular import chain between scheduler and core.",
      },
      {
        id: "documentation",
        label: "DOCUMENTATION",
        score: { value: 79, band: "good" },
        explanation:
          "Strong README and ADRs; API reference and contribution guide lag behind the code.",
      },
      {
        id: "maintainability",
        label: "MAINTAINABILITY",
        score: { value: 71, band: "good" },
        explanation:
          "Clear ownership and CI gates; two hotspots absorb most recent churn.",
      },
    ],
  },
  structure: {
    fileTree: [
      {
        name: "apps",
        path: "apps",
        type: "dir",
        children: [
          {
            name: "web",
            path: "apps/web",
            type: "dir",
            children: [
              {
                name: "src",
                path: "apps/web/src",
                type: "dir",
                children: [
                  {
                    name: "app",
                    path: "apps/web/src/app",
                    type: "dir",
                    children: [
                      { name: "layout.tsx", path: "apps/web/src/app/layout.tsx", type: "file", loc: 96, language: "TypeScript" },
                      { name: "page.tsx", path: "apps/web/src/app/page.tsx", type: "file", loc: 412, language: "TypeScript" },
                    ],
                  },
                  {
                    name: "components",
                    path: "apps/web/src/components",
                    type: "dir",
                    children: [
                      { name: "Editor.tsx", path: "apps/web/src/components/Editor.tsx", type: "file", loc: 1248, language: "TypeScript" },
                      { name: "Canvas.tsx", path: "apps/web/src/components/Canvas.tsx", type: "file", loc: 634, language: "TypeScript" },
                      { name: "Inspector.tsx", path: "apps/web/src/components/Inspector.tsx", type: "file", loc: 287, language: "TypeScript" },
                    ],
                  },
                  {
                    name: "hooks",
                    path: "apps/web/src/hooks",
                    type: "dir",
                    children: [
                      { name: "useForgeState.ts", path: "apps/web/src/hooks/useForgeState.ts", type: "file", loc: 219, language: "TypeScript" },
                    ],
                  },
                ],
              },
              { name: "package.json", path: "apps/web/package.json", type: "file", loc: 48, language: "JSON" },
            ],
          },
          {
            name: "api",
            path: "apps/api",
            type: "dir",
            children: [
              {
                name: "src",
                path: "apps/api/src",
                type: "dir",
                children: [
                  {
                    name: "routes",
                    path: "apps/api/src/routes",
                    type: "dir",
                    children: [
                      { name: "builds.ts", path: "apps/api/src/routes/builds.ts", type: "file", loc: 356, language: "TypeScript" },
                      { name: "auth.ts", path: "apps/api/src/routes/auth.ts", type: "file", loc: 244, language: "TypeScript" },
                    ],
                  },
                  { name: "server.ts", path: "apps/api/src/server.ts", type: "file", loc: 178, language: "TypeScript" },
                ],
              },
            ],
          },
        ],
      },
      {
        name: "packages",
        path: "packages",
        type: "dir",
        children: [
          {
            name: "ui",
            path: "packages/ui",
            type: "dir",
            children: [
              { name: "index.ts", path: "packages/ui/index.ts", type: "file", loc: 62, language: "TypeScript" },
              { name: "tokens.ts", path: "packages/ui/tokens.ts", type: "file", loc: 141, language: "TypeScript" },
            ],
          },
          {
            name: "core",
            path: "packages/core",
            type: "dir",
            children: [
              { name: "engine.ts", path: "packages/core/engine.ts", type: "file", loc: 903, language: "TypeScript" },
              { name: "scheduler.ts", path: "packages/core/scheduler.ts", type: "file", loc: 1120, language: "TypeScript" },
              { name: "graph.ts", path: "packages/core/graph.ts", type: "file", loc: 487, language: "TypeScript" },
            ],
          },
          {
            name: "cli",
            path: "packages/cli",
            type: "dir",
            children: [
              { name: "main.ts", path: "packages/cli/main.ts", type: "file", loc: 371, language: "TypeScript" },
              { name: "commands.ts", path: "packages/cli/commands.ts", type: "file", loc: 268, language: "TypeScript" },
            ],
          },
        ],
      },
      {
        name: "components",
        path: "components",
        type: "dir",
        children: [
          { name: "SharedNav.tsx", path: "components/SharedNav.tsx", type: "file", loc: 154, language: "TypeScript" },
          { name: "MetricGrid.tsx", path: "components/MetricGrid.tsx", type: "file", loc: 203, language: "TypeScript" },
        ],
      },
      {
        name: "lib",
        path: "lib",
        type: "dir",
        children: [
          { name: "client.ts", path: "lib/client.ts", type: "file", loc: 97, language: "TypeScript" },
          { name: "config.ts", path: "lib/config.ts", type: "file", loc: 66, language: "TypeScript" },
        ],
      },
      {
        name: "scripts",
        path: "scripts",
        type: "dir",
        children: [
          { name: "seed.py", path: "scripts/seed.py", type: "file", loc: 214, language: "Python" },
          { name: "migrate.py", path: "scripts/migrate.py", type: "file", loc: 132, language: "Python" },
          { name: "deploy.sh", path: "scripts/deploy.sh", type: "file", loc: 88, language: "Shell" },
        ],
      },
      {
        name: "tests",
        path: "tests",
        type: "dir",
        children: [
          { name: "engine.test.ts", path: "tests/engine.test.ts", type: "file", loc: 421, language: "TypeScript" },
          { name: "scheduler.test.ts", path: "tests/scheduler.test.ts", type: "file", loc: 389, language: "TypeScript" },
          { name: "graph.test.ts", path: "tests/graph.test.ts", type: "file", loc: 302, language: "TypeScript" },
          { name: "cli.test.ts", path: "tests/cli.test.ts", type: "file", loc: 176, language: "TypeScript" },
        ],
      },
      {
        name: "docs",
        path: "docs",
        type: "dir",
        children: [
          { name: "architecture.md", path: "docs/architecture.md", type: "file", loc: 244, language: "Markdown" },
          { name: "adr-001-scheduling.md", path: "docs/adr-001-scheduling.md", type: "file", loc: 118, language: "Markdown" },
          { name: "adr-002-caching.md", path: "docs/adr-002-caching.md", type: "file", loc: 96, language: "Markdown" },
        ],
      },
      { name: "README.md", path: "README.md", type: "file", loc: 382, language: "Markdown" },
      { name: "LICENSE", path: "LICENSE", type: "file", loc: 21, language: "Text" },
      { name: "package.json", path: "package.json", type: "file", loc: 74, language: "JSON" },
      { name: "turbo.json", path: "turbo.json", type: "file", loc: 43, language: "JSON" },
    ],
    stats: {
      totalFiles: 1248,
      linesOfCode: 412000,
      languages: 6,
      dependencies: 12,
      repoSizeKb: 10240,
      testFiles: 68,
    },
    languages: [
      { name: "TypeScript", pct: 68.4, loc: 281800, color: "#7A2BF5" },
      { name: "TSX", pct: 14.2, loc: 58500, color: "#9B5CF9" },
      { name: "Python", pct: 8.1, loc: 33400, color: "#0A0A0A" },
      { name: "CSS", pct: 5.3, loc: 21800, color: "#C8FA4F" },
      { name: "Shell", pct: 2.6, loc: 10700, color: "#6B6B66" },
      { name: "Other", pct: 1.4, loc: 5800, color: "#D8D6CE" },
    ],
  },
  graph: {
    nodes: [
      { id: "web", label: "web", cluster: "apps", kind: "app" },
      { id: "api", label: "api", cluster: "apps", kind: "app" },
      { id: "ui", label: "@orbit/ui", cluster: "packages", kind: "package" },
      { id: "core", label: "@orbit/core", cluster: "packages", kind: "package" },
      { id: "cli", label: "@orbit/cli", cluster: "packages", kind: "package" },
      { id: "lib", label: "lib/shared", cluster: "shared", kind: "lib" },
      { id: "scripts", label: "scripts", cluster: "shared", kind: "lib" },
      { id: "zod", label: "zod", cluster: "external", kind: "external" },
      { id: "fastify", label: "fastify", cluster: "external", kind: "external" },
      { id: "react", label: "react", cluster: "external", kind: "external" },
      { id: "drizzle", label: "drizzle", cluster: "external", kind: "external" },
    ],
    edges: [
      { from: "web", to: "ui" },
      { from: "web", to: "core" },
      { from: "web", to: "lib" },
      { from: "web", to: "react" },
      { from: "api", to: "core" },
      { from: "api", to: "lib" },
      { from: "api", to: "fastify" },
      { from: "api", to: "drizzle" },
      { from: "cli", to: "core" },
      { from: "cli", to: "lib" },
      { from: "ui", to: "react" },
      { from: "core", to: "zod" },
      { from: "scripts", to: "lib" },
    ],
    clusters: [
      { id: "apps", label: "APPS", color: "#7A2BF5" },
      { id: "packages", label: "PACKAGES", color: "#C8FA4F" },
      { id: "shared", label: "SHARED", color: "#0A0A0A" },
      { id: "external", label: "EXTERNAL", color: "#6B6B66" },
    ],
  },
  issues: [
    {
      id: "ISS-001",
      title: "LARGE FILE SIZE",
      severity: "high",
      detail:
        "apps/web/src/components/Editor.tsx concentrates 1,248 lines of rendering, state and serialization logic in one component, making it the largest file in the web workspace.",
      file: "apps/web/src/components/Editor.tsx",
      fileLineCount: 1248,
      line: 412,
      evidence: [
        "File is 3.1× the team's 400-line threshold",
        "Component exceeds recommended size threshold",
        "Multiple responsibilities detected: canvas rendering, undo stack, clipboard serialization",
      ],
      recommendation:
        "Split the component into smaller modules: extract the undo stack and clipboard serialization into hooks, and break the canvas into composable subcomponents.",
    },
    {
      id: "ISS-002",
      title: "HARDCODED CREDENTIAL PATTERN",
      severity: "critical",
      detail:
        "A token literal matching the AWS key pattern is assigned in the deploy script and committed to the repository history.",
      file: "scripts/deploy.sh",
      fileLineCount: 88,
      line: 31,
      evidence: [
        "Pattern matches AWS access key format (AKIA…)",
        "Secret scanner: high confidence, not a test fixture",
        "No secret-management layer present in the deploy path",
      ],
      recommendation:
        "Revoke the credential immediately, purge it from git history, and load deployment secrets from the CI secret store instead of literals.",
    },
    {
      id: "ISS-003",
      title: "CIRCULAR IMPORT CHAIN",
      severity: "high",
      detail:
        "packages/core/scheduler.ts imports packages/core/engine.ts, which imports back from scheduler — a cycle that blocks tree-shaking and complicates test isolation.",
      file: "packages/core/scheduler.ts",
      fileLineCount: 1120,
      line: 47,
      evidence: [
        "Cycle detected: scheduler → engine → scheduler",
        "Bundle analyzer flags both modules as non-tree-shakeable",
        "Test suites mock both modules to break the cycle",
      ],
      recommendation:
        "Move the shared scheduling types into a leaf module both files can import, breaking the cycle at the type boundary.",
    },
    {
      id: "ISS-004",
      title: "UNTESTED CRITICAL PATH",
      severity: "high",
      detail:
        "The scheduler's retry and backoff paths — the most failure-prone logic in the build orchestrator — have no dedicated test coverage.",
      file: "packages/core/scheduler.ts",
      fileLineCount: 1120,
      evidence: [
        "68 test files; none exercise retry/backoff branches",
        "Churn analysis: scheduler is in the top 3 most-changed files this quarter",
        "Two recent production incidents traced to retry behavior",
      ],
      recommendation:
        "Add a dedicated test suite for retry/backoff with simulated clock before the next release train.",
    },
    {
      id: "ISS-005",
      title: "OUTDATED DEPENDENCIES",
      severity: "medium",
      detail:
        "Two dependencies carry published advisories: fastify 4.x has a moderate ReDoS advisory, and drizzle-orm is two minor versions behind its security patch line.",
      file: "apps/api/package.json",
      evidence: [
        "fastify 4.24.3 → GHSA-…-24x (moderate, ReDoS)",
        "drizzle-orm 0.31 → 0.33 includes input-validation patch",
        "No automated dependency-update workflow configured",
      ],
      recommendation:
        "Upgrade fastify to the patched 4.x line, bump drizzle-orm, and enable automated dependency updates with a weekly cadence.",
    },
    {
      id: "ISS-006",
      title: "DUPLICATED VALIDATION LOGIC",
      severity: "medium",
      detail:
        "Build-target validation exists in three near-identical copies across web, api and cli, drifting independently.",
      file: "packages/core/graph.ts",
      fileLineCount: 487,
      line: 128,
      evidence: [
        "3 copies ≥ 90% similarity detected",
        "Copies have already diverged: CLI accepts a flag web rejects",
      ],
      recommendation:
        "Extract a single @orbit/core validation module and re-export it to all three workspaces.",
    },
    {
      id: "ISS-007",
      title: "DOCUMENTATION DRIFT",
      severity: "low",
      detail:
        "The public API reference documents 14 exports; the ui package now exposes 23. The contribution guide predates the workspace migration.",
      file: "docs/architecture.md",
      fileLineCount: 244,
      evidence: [
        "9 of 23 public exports undocumented",
        "CONTRIBUTING.md references the pre-monorepo layout",
      ],
      recommendation:
        "Generate API docs from source on release and refresh the contribution guide against the current workspace layout.",
    },
    {
      id: "ISS-008",
      title: "LOW TEST COVERAGE — CLI",
      severity: "medium",
      detail:
        "The CLI package averages 38% branch coverage; command parsing for the forge run --watch path is uncovered.",
      file: "packages/cli/commands.ts",
      fileLineCount: 268,
      line: 96,
      evidence: [
        "Branch coverage: 38% vs 74% repo average",
        "--watch path has zero assertions",
      ],
      recommendation:
        "Cover command parsing and the --watch path with table-driven tests before adding the next CLI command.",
    },
    {
      id: "ISS-009",
      title: "COMPLEX FUNCTION",
      severity: "low",
      detail:
        "resolveBuildGraph() nests five conditional layers and spans 94 lines, the highest cyclomatic complexity (17) in the repository.",
      file: "packages/core/graph.ts",
      fileLineCount: 487,
      line: 210,
      evidence: [
        "Cyclomatic complexity 17 vs threshold 10",
        "94-line function body, single return",
      ],
      recommendation:
        "Decompose into resolveNodes / resolveEdges / validateCycle helpers and unit-test each in isolation.",
    },
  ],
  insights: [
    {
      id: "INS-001",
      tag: "ARCHITECTURE",
      title: "Break the scheduler cycle before it hardens",
      explanation:
        "The scheduler/engine import cycle is small today but sits on the hot path every workspace depends on. Cycles like this tend to accrete until refactors become risky.",
      evidence: ["Cycle: scheduler → engine → scheduler", "Both modules non-tree-shakeable in the bundle report"],
      recommendation:
        "Introduce a leaf @orbit/core/types module for shared scheduling types; both sides import from it and the cycle dissolves.",
    },
    {
      id: "INS-002",
      tag: "TESTING",
      title: "The highest-churn file has the weakest tests",
      explanation:
        "scheduler.ts is top-3 in quarterly churn yet its retry logic is untested. Churn-plus-low-coverage is the strongest predictor of regression in this codebase.",
      evidence: ["Top-3 churn, no retry tests", "Two recent incidents traced to retry behavior"],
      recommendation:
        "Prioritize a simulated-clock test harness for retry/backoff before the next release train.",
    },
    {
      id: "INS-003",
      tag: "SECURITY",
      title: "Treat the credential as live until proven revoked",
      explanation:
        "The flagged token follows the live AWS key pattern and is not marked as a fixture. History purge matters as much as rotation: clones and forks may retain it.",
      evidence: ["AKIA-pattern literal in deploy.sh:31", "No secret scanning pre-commit hook configured"],
      recommendation:
        "Revoke, purge history with git filter-repo, add gitleaks to pre-commit and CI, and move deploy secrets to the CI store.",
    },
    {
      id: "INS-004",
      tag: "MAINTAINABILITY",
      title: "One extraction removes three drift points",
      explanation:
        "The tripled validation logic has already diverged — the CLI accepts a flag the web build rejects. Divergent copies turn config bugs into user-facing inconsistencies.",
      evidence: ["3 copies ≥90% similar", "Behavioral drift already observed between CLI and web"],
      recommendation:
        "Extract to @orbit/core/validate and make all three workspaces consume the single source of truth.",
    },
    {
      id: "INS-005",
      tag: "DOCUMENTATION",
      title: "Docs rot is localized — fix it cheaply now",
      explanation:
        "README and ADRs are strong; only the API reference and contribution guide lag. Because drift is localized, a generated-docs pipeline closes it permanently rather than manually.",
      evidence: ["9/23 public exports undocumented", "CONTRIBUTING.md describes the pre-monorepo layout"],
      recommendation:
        "Wire an API-doc generator into the release workflow and rewrite CONTRIBUTING.md against the current workspace map.",
    },
    {
      id: "INS-006",
      tag: "CODE QUALITY",
      title: "Editor.tsx is the ceiling on web velocity",
      explanation:
        "Every web change touches Editor.tsx — it concentrates rendering, undo and clipboard concerns. Splitting it lowers review friction for the highest-traffic surface in the app.",
      evidence: ["1,248 lines, 3 responsibilities", "Most-reviewed file in the web workspace"],
      recommendation:
        "Sequence the split in three PRs: hooks first, then canvas subcomponents, then serialization utilities.",
    },
  ],
  system: [
    {
      id: "github_api",
      label: "GITHUB API",
      status: "connected",
      latencyMs: 184,
      lastChecked: "2026-10-06T10:12:04Z",
      version: "REST v3 · 2026-09-01",
    },
    {
      id: "analysis_engine",
      label: "ANALYSIS ENGINE",
      status: "ready",
      latencyMs: 12,
      lastChecked: "2026-10-06T10:12:04Z",
      version: "xray.engine v2.7.3",
    },
    {
      id: "ai_engine",
      label: "AI ENGINE",
      status: "ready",
      latencyMs: 45,
      lastChecked: "2026-10-06T10:12:04Z",
      version: "insight.model v1.4",
    },
    {
      id: "scan_engine",
      label: "SCAN ENGINE",
      status: "ready",
      latencyMs: 8,
      lastChecked: "2026-10-06T10:12:04Z",
      version: "scanner v3.0.1",
    },
  ],
};

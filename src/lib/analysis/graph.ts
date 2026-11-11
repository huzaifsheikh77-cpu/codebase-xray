import type { AnalysisContext } from "./context";
import type { ParseSummary } from "./parsers/types";
import { dirName } from "./tree-utils";
import { classifyPath } from "./tree-utils";

/**
 * GRAPH — small, accurate, and explicit about what it could not resolve.
 *
 * Nodes come from real evidence only: workspace packages (from a manifest
 * declaration) or top-level source directories, plus a synthetic root node
 * for root-level entry files, plus external dependencies from the primary
 * manifest. Edges come from parsed import statements (AST where available).
 *
 * Resolution order for a specifier:
 *   1. relative  → normalise against the importing file, try extensions/index
 *   2. alias     → tsconfig/jsconfig `compilerOptions.paths` (+ baseUrl)
 *   3. external  → a node from the primary manifest
 *   4. workspace → match a workspace package's declared name
 * Anything that looks internal but resolves to nothing increments
 * `unresolvedImports`; it is never silently reported as "zero edges".
 */

export interface RawGraph {
  nodes: { id: string; label: string; cluster: string; kind: "app" | "package" | "module" | "external" }[];
  edges: { from: string; to: string; label?: string }[];
  clusters: { id: string; label: string; color: string }[];
  omittedModules: number;
  /** internal specifiers that could not be mapped onto a node */
  unresolvedImports: number;
}

const WORKSPACE_NODE_CAP = 12;
const MAX_NODES = 32;
const MAX_EDGES = 60;
const ROOT_NODE_ID = "__root__";

const RESOLVE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".rb",
  ".php",
  ".cs",
  ".c",
  ".h",
  ".cpp",
];

function globToRegex(glob: string): RegExp {
  const body = glob
    .split("/")
    .map((seg) => (seg === "**" ? ".*" : seg.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]+")))
    .join("/");
  return new RegExp(`^${body}$`);
}

function resolveRelative(fromDir: string, spec: string): string {
  const stack = fromDir ? fromDir.split("/") : [];
  for (const part of spec.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function workspaceGlobs(pkgJson?: string, pnpmYaml?: string, lernaJson?: string): string[] {
  const globs: string[] = [];
  if (pkgJson) {
    try {
      const parsed = JSON.parse(pkgJson) as { workspaces?: string[] | { packages?: string[] } };
      const ws = Array.isArray(parsed.workspaces) ? parsed.workspaces : parsed.workspaces?.packages;
      if (ws) globs.push(...ws);
    } catch {
      /* malformed manifest — ignore */
    }
  }
  if (pnpmYaml) {
    const m = pnpmYaml.match(/packages:\s*\n((?:\s*-\s*.+\n?)+)/);
    if (m) {
      for (const line of m[1].split("\n")) {
        const g = line.replace(/^\s*-\s*/, "").trim().replace(/['"]/g, "");
        if (g) globs.push(g);
      }
    }
  }
  if (lernaJson) {
    try {
      const parsed = JSON.parse(lernaJson) as { packages?: string[] };
      if (Array.isArray(parsed.packages)) globs.push(...parsed.packages);
    } catch {
      /* malformed manifest — ignore */
    }
  }
  return globs.filter((g) => g && !g.startsWith("!")).map((g) => g.replace(/^\.\//, "").replace(/\/$/, ""));
}

interface TsPaths {
  baseUrl: string;
  paths: Record<string, string[]>;
}

/** tsconfig allows comments and trailing commas; strip both before parsing. */
function parseTsPaths(ctx: AnalysisContext): TsPaths {
  const raw = ctx.fetched.get("tsconfig.json") ?? ctx.fetched.get("jsconfig.json");
  if (!raw) return { baseUrl: "", paths: {} };
  const cleaned = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,(\s*[}\]])/g, "$1");
  try {
    const parsed = JSON.parse(cleaned) as {
      compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> };
    };
    const co = parsed.compilerOptions ?? {};
    const rawBase = (co.baseUrl ?? "").trim();
    // `baseUrl: "."` is the common form and must normalise to "" — otherwise
    // joins produce "././shared/x" and no file ever matches.
    const baseUrl =
      rawBase === "." || rawBase === "./" ? "" : rawBase.replace(/^\.\//, "").replace(/\/$/, "");
    return { baseUrl, paths: co.paths ?? {} };
  } catch {
    return { baseUrl: "", paths: {} };
  }
}

/** Match one `paths` pattern (single `*`) and return the captured segment. */
function matchAlias(spec: string, pattern: string): string | null {
  const star = pattern.indexOf("*");
  if (star === -1) return spec === pattern ? "" : null;
  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  if (!spec.startsWith(prefix) || !spec.endsWith(suffix)) return null;
  return spec.slice(prefix.length, spec.length - suffix.length);
}

export function buildGraph(
  ctx: AnalysisContext,
  primaryDeps: { name: string; names: string[] } | null,
  parsed?: ParseSummary,
): RawGraph {
  const dirs = new Set<string>();
  const dirFileCount = new Map<string, number>();
  const fileSet = new Set<string>();

  for (const e of ctx.entries) {
    fileSet.add(e.path);
    const parts = e.path.split("/");
    const maxDepth = Math.min(parts.length - 1, 4);
    for (let i = 1; i <= maxDepth; i++) {
      const dir = parts.slice(0, i).join("/");
      dirs.add(dir);
      dirFileCount.set(dir, (dirFileCount.get(dir) ?? 0) + 1);
    }
  }

  const globs = workspaceGlobs(
    ctx.fetched.get("package.json"),
    ctx.fetched.get("pnpm-workspace.yaml") ?? ctx.fetched.get("pnpm-workspace.yml"),
    ctx.fetched.get("lerna.json"),
  );

  const packageDirs = new Set<string>();
  for (const g of globs) {
    const re = globToRegex(g);
    for (const d of dirs) if (re.test(d)) packageDirs.add(d);
  }

  const nodes: RawGraph["nodes"] = [];
  const clusters: RawGraph["clusters"] = [];
  const seen = new Set<string>();
  let omittedModules = 0;

  const addNode = (id: string, label: string, cluster: string, kind: RawGraph["nodes"][number]["kind"]): void => {
    if (seen.has(id) || nodes.length >= MAX_NODES) return;
    seen.add(id);
    nodes.push({ id, label, cluster, kind });
  };

  if (packageDirs.size > 0) {
    clusters.push({ id: "packages", label: "PACKAGES", color: "#a5a5fa" });
    const ordered = [...packageDirs].sort(
      (a, b) => (dirFileCount.get(b) ?? 0) - (dirFileCount.get(a) ?? 0) || a.localeCompare(b),
    );
    const shown = ordered.slice(0, WORKSPACE_NODE_CAP);
    omittedModules = ordered.length - shown.length;
    for (const d of shown) {
      const pkgJson = ctx.fetched.get(`${d}/package.json`);
      let label = d.split("/").pop() ?? d;
      if (pkgJson) {
        try {
          const p = JSON.parse(pkgJson) as { name?: string };
          if (p.name) label = p.name;
        } catch {
          /* keep directory name */
        }
      }
      addNode(d, label, "packages", "package");
    }
  }

  // Top-level modules are added ALWAYS, not only when there are no workspace
  // packages. Previously a monorepo suppressed `src/` and `shared/` entirely,
  // so imports between them had no node to attach to (regression: the
  // monorepo benchmark fixture lost its tsconfig-alias edge). A directory
  // that merely contains workspace packages (e.g. `packages/`) is skipped —
  // its children are already nodes.
  {
    const dirFiles = new Map<string, number>();
    for (const e of ctx.entries) {
      if (!e.path.includes("/")) continue;
      const top = e.path.split("/")[0];
      if (top.startsWith(".")) continue;
      dirFiles.set(top, (dirFiles.get(top) ?? 0) + 1);
    }
    const containsPackage = (name: string): boolean =>
      [...packageDirs].some((d) => d === name || d.startsWith(`${name}/`));
    const top = [...dirFiles.entries()]
      .filter(([name]) => name !== ".github" && !containsPackage(name))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8);
    if (top.length > 0) {
      if (!clusters.some((c) => c.id === "modules")) {
        clusters.push({ id: "modules", label: "MODULES", color: "#a5a5fa" });
      }
      for (const [name] of top) addNode(name, name, "modules", "module");
    }
  }

  // Root-level entry files (index.js, main.py, Justfile-adjacent scripts…)
  // belong to a real module too. Without this node their imports produced no
  // edges at all (regression: sindresorhus/p-map → 6 nodes, 0 edges).
  const hasRootSource = ctx.entries.some((e) => !e.path.includes("/") && classifyPath(e.path) === "source");
  if (hasRootSource) {
    if (!clusters.some((c) => c.id === "modules")) {
      clusters.push({ id: "modules", label: "MODULES", color: "#a5a5fa" });
    }
    addNode(ROOT_NODE_ID, "(root)", "modules", "app");
  }

  if (primaryDeps && primaryDeps.names.length > 0) {
    clusters.push({ id: "external", label: "EXTERNAL", color: "#8b8bf7" });
    for (const name of primaryDeps.names.slice(0, 8)) addNode(`ext:${name}`, name, "external", "external");
  }

  const nodeIds = nodes.map((n) => n.id);
  const byLength = [...nodeIds].sort((a, b) => b.length - a.length);

  /** Longest node whose directory contains the file; root node for depth-0 files. */
  const nodeForFile = (path: string): string | null => {
    if (!path.includes("/")) return seen.has(ROOT_NODE_ID) ? ROOT_NODE_ID : null;
    for (const id of byLength) {
      if (id === ROOT_NODE_ID) continue;
      if (path === id || path.startsWith(`${id}/`)) return id;
    }
    return null;
  };

  const tsPaths = parseTsPaths(ctx);

  const resolveFile = (candidate: string): string | null => {
    let path = candidate.replace(/^\/+/, "");
    while (path.startsWith("./")) path = path.slice(2);
    if (!path) return null;
    // TypeScript emits `./x.js` for a `./x.ts` source file.
    const stripped = path.replace(/\.(js|jsx|mjs|cjs)$/i, "");
    for (const base of stripped !== path ? [path, stripped] : [path]) {
      if (fileSet.has(base)) return base;
      for (const ext of RESOLVE_EXTENSIONS) if (fileSet.has(`${base}${ext}`)) return `${base}${ext}`;
      for (const ext of RESOLVE_EXTENSIONS) if (fileSet.has(`${base}/index${ext}`)) return `${base}/index${ext}`;
    }
    return null;
  };

  const resolveAlias = (spec: string): string | null => {
    for (const [pattern, targets] of Object.entries(tsPaths.paths)) {
      const captured = matchAlias(spec, pattern);
      if (captured === null) continue;
      for (const target of targets) {
        const replaced = target.indexOf("*") === -1 ? target : target.split("*").join(captured);
        const joined = [tsPaths.baseUrl, replaced].filter(Boolean).join("/");
        const resolved = resolveFile(joined);
        if (resolved) return resolved;
      }
    }
    return null;
  };

  const edges: RawGraph["edges"] = [];
  const edgeSet = new Set<string>();
  let unresolvedImports = 0;

  for (const [path, content] of ctx.fetched) {
    if (edges.length >= MAX_EDGES) break;
    if (content.length > 200_000) continue;
    const fromNode = nodeForFile(path);
    if (!fromNode) continue;

    const parsedFile = parsed?.byPath.get(path);
    const specs: { specifier: string; typeOnly?: boolean }[] = parsedFile
      ? parsedFile.imports.filter((i) => !i.typeOnly).map((i) => ({ specifier: i.specifier, typeOnly: i.typeOnly }))
      : fallbackSpecs(path, content);

    const fromDir = dirName(path);

    for (const { specifier: rawSpec } of specs) {
      if (edges.length >= MAX_EDGES) break;
      const spec = rawSpec.trim();
      if (!spec) continue;

      let target: string | null = null;
      let internal = false;
      let internalLookedResolvable = false;

      if (spec.startsWith(".")) {
        internal = true;
        internalLookedResolvable = true;
        const resolved = resolveFile(resolveRelative(fromDir, spec));
        if (resolved) target = nodeForFile(resolved);
      } else {
        const aliasResolved = resolveAlias(spec);
        if (aliasResolved) {
          internal = true;
          internalLookedResolvable = true;
          target = nodeForFile(aliasResolved);
        } else if (tsPaths.paths && Object.keys(tsPaths.paths).some((p) => matchAlias(spec, p) !== null)) {
          // It matches a declared alias but the target file was not inspected.
          internal = true;
          internalLookedResolvable = true;
        } else {
          const ext = nodes.find((n) => n.kind === "external" && (spec === n.label || spec.startsWith(`${n.label}/`)));
          // Python imports are dotted (`pkg.cli`); the module root is the node.
          const dottedRoot = spec.includes(".") ? spec.split(".")[0] : null;
          if (ext) {
            target = ext.id;
          } else {
            const ws =
              nodes.find(
                (n) => (n.kind === "package" || n.kind === "module") && (spec === n.label || spec.startsWith(`${n.label}/`)),
              ) ??
              (dottedRoot
                ? nodes.find((n) => (n.kind === "package" || n.kind === "module") && (n.id === dottedRoot || n.label === dottedRoot))
                : undefined);
            if (ws) target = ws.id;
            else if (!spec.startsWith("node:") && /^[@a-zA-Z]/.test(spec) && spec.includes("/") && nodes.some((n) => n.kind === "package")) {
              // scoped import that could be a workspace package we did not fetch
              internal = true;
              internalLookedResolvable = true;
            }
          }
        }
      }

      if (internal && internalLookedResolvable && !target) unresolvedImports++;
      if (!target || target === fromNode) continue;
      const key = `${fromNode}->${target}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ from: fromNode, to: target });
    }
  }

  return { nodes, edges, clusters, omittedModules, unresolvedImports };
}

/** Regex fallback for files no parser claimed (rare; most languages parse). */
function fallbackSpecs(path: string, content: string): { specifier: string }[] {
  const specs: { specifier: string }[] = [];
  if (path.endsWith(".py")) {
    const re = /^\s*(?:import\s+([\w.]+)|from\s+(\w[\w.]*)\s+import)/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null && specs.length < 200) {
      specs.push({ specifier: m[1] ?? m[2] });
    }
    return specs;
  }
  const re = /(?:import\s+(?:[\w*{},\s$]+from\s+)?|export\s+[\w*{},\s$]+from\s+|require\()\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null && specs.length < 200) specs.push({ specifier: m[1] });
  return specs;
}

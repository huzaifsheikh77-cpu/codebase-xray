import type { AnalysisContext } from "./context";
import { LIMITS } from "./limits";

/**
 * GRAPH — deliberately small and accurate (Phase-2 amendment #9).
 * Nodes come from real evidence only:
 *  - workspace packages (package.json "workspaces" / pnpm-workspace.yaml),
 *    falling back to top-level source directories when no workspace is declared
 *  - external dependencies from the primary manifest
 * Edges are parsed from fetched files' import/require statements and mapped
 * to those nodes. If nothing reliable is found, the graph is simply smaller —
 * never invented.
 */

export interface RawGraph {
  nodes: { id: string; label: string; cluster: string; kind: "app" | "package" | "module" | "external" }[];
  edges: { from: string; to: string; label?: string }[];
  clusters: { id: string; label: string; color: string }[];
  /** workspace packages that exist but did not fit the node budget */
  omittedModules: number;
}

/** Node budget shared by workspace packages and externals (LIMITS.maxGraphNodes). */
const WORKSPACE_NODE_CAP = 12;

const IMPORT_RE = /(?:import\s+(?:[\w*{},\s]+from\s+)?|export\s+[\w*{},\s]+from\s+|require\()\s*["']([^"']+)["']/g;
/** Python imports: absolute module roots only (`import click`, `from pkg.mod import x`).
 *  Relative imports (`from .db import y`) resolve inside the same top-level
 *  node, so they can never produce a cross-node edge — skipping them is
 *  accurate, not a shortcut. */
const PY_IMPORT_RE = /^\s*(?:import\s+([\w.]+)|from\s+(\w[\w.]*)\s+import\s)/gm;

function workspaceGlobs(
  pkgJson: string | undefined,
  pnpmYaml: string | undefined,
  lernaJson?: string | undefined,
): string[] {
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
  // pnpm supports negated globs; the graph only needs the positive ones.
  return globs.filter((g) => g && !g.startsWith("!")).map((g) => g.replace(/^\.\//, "").replace(/\/$/, ""));
}

function globToRegex(glob: string): RegExp {
  const body = glob
    .split("/")
    .map((seg) => (seg === "**" ? ".*" : seg.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]+")))
    .join("/");
  return new RegExp(`^${body}$`);
}

/** Normalize a relative import path against the importing file's directory. */
function resolveRelative(fromDir: string, spec: string): string {
  const stack = fromDir ? fromDir.split("/") : [];
  for (const part of spec.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

/**
 * Match workspace globs like "packages/*" (or multi-segment globs) against
 * real directory paths. The previous prefix comparison only understood
 * single-level globs against top-level directories, so a package glob never
 * matched and pnpm/yarn monorepos produced no workspace nodes.
 */
function globToDirs(glob: string, dirs: Set<string>): string[] {
  const re = globToRegex(glob);
  const out: string[] = [];
  for (const d of dirs) if (re.test(d)) out.push(d);
  return out.sort();
}

export function buildGraph(ctx: AnalysisContext, primaryDeps: { name: string; names: string[] } | null): RawGraph {
  // Directory paths (bounded depth) and per-directory blob counts, built in
  // one pass over the eligible entries.
  const dirs = new Set<string>();
  const dirFileCount = new Map<string, number>();
  for (const e of ctx.entries) {
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
  for (const g of globs) for (const d of globToDirs(g, dirs)) packageDirs.add(d);
  let omittedModules = 0;

  const nodes: RawGraph["nodes"] = [];
  const clusters: RawGraph["clusters"] = [];
  const seen = new Set<string>();

  const addNode = (id: string, label: string, cluster: string, kind: RawGraph["nodes"][number]["kind"]) => {
    if (seen.has(id) || nodes.length >= LIMITS.maxGraphNodes) return;
    seen.add(id);
    nodes.push({ id, label, cluster, kind });
  };

  if (packageDirs.size > 0) {
    clusters.push({ id: "packages", label: "PACKAGES", color: "#a5a5fa" });
    // Largest workspaces first (subtree blob count), then path for determinism.
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
        } catch { /* keep dir name */ }
      }
      addNode(d, label, "packages", "package");
    }
  }

  if (nodes.length === 0) {
    // no workspaces — top-level source DIRECTORIES, largest first.
    // Top-level FILES (LICENSE, Justfile, .gitignore, …) are not modules.
    const dirFiles = new Map<string, number>();
    for (const e of ctx.entries) {
      if (!e.path.includes("/")) continue; // a top-level file
      const top = e.path.split("/")[0];
      if (top.startsWith(".")) continue; // dot-dirs are metadata, not modules
      dirFiles.set(top, (dirFiles.get(top) ?? 0) + 1);
    }
    const top = [...dirFiles.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .filter(([name]) => name !== ".github");
    if (top.length > 0) {
      clusters.push({ id: "modules", label: "MODULES", color: "#a5a5fa" });
      for (const [name] of top) addNode(name, name, "modules", "module");
    }
  }

  // external dependencies from the primary manifest (evidence-based)
  if (primaryDeps && primaryDeps.names.length > 0) {
    clusters.push({ id: "external", label: "EXTERNAL", color: "#8b8bf7" });
    for (const name of primaryDeps.names.slice(0, 6)) addNode(`ext:${name}`, name, "external", "external");
  }

  // edges from fetched files' imports — mapped onto existing nodes only
  const edgeSet = new Set<string>();
  const edges: RawGraph["edges"] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const [path, content] of ctx.fetched) {
    if (content.length > 200_000) continue; // bound regex work
    const fromDir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : path.split("/")[0];
    const fromNode = nodes.find((n) => fromDir === n.id || fromDir.startsWith(`${n.id}/`))?.id;
    if (!fromNode) continue;

    const specs: string[] = [];
    if (path.endsWith(".py")) {
      PY_IMPORT_RE.lastIndex = 0;
      let pm: RegExpExecArray | null;
      while ((pm = PY_IMPORT_RE.exec(content)) !== null && specs.length < 200) {
        const name = pm[1] ?? pm[2];
        if (name) specs.push(name.split(".")[0]);
      }
    } else {
      IMPORT_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = IMPORT_RE.exec(content)) !== null && specs.length < 200) {
        specs.push(m[1]);
      }
    }

    for (const spec of specs) {
      if (edges.length >= LIMITS.maxGraphEdges) break;
      // Resolve an import specifier onto an existing node:
      //  - external dependency by package name (`react`, `react/jsx-runtime`)
      //  - relative path normalized against the importing directory (`../ui`)
      //  - bare specifier by workspace package name (`@acme/core`) or by
      //    Python top-level module id (`pkg`)
      const ext = nodes.find((n) => n.kind === "external" && (spec === n.label || spec.startsWith(`${n.label}/`)));
      let target: string | null = ext?.id ?? null;
      if (!target) {
        if (spec.startsWith(".")) {
          const resolved = resolveRelative(fromDir, spec);
          target =
            nodes.find(
              (n) => n.kind !== "external" && (resolved === n.id || resolved.startsWith(`${n.id}/`)),
            )?.id ?? null;
        } else {
          // Workspace packages are imported by their package.json `name`
          // (`@acme/core`), not by directory, so the label is a valid match.
          target =
            nodes.find((n) => n.id === spec)?.id ??
            nodes.find(
              (n) => (n.kind === "package" || n.kind === "module") && (spec === n.label || spec.startsWith(`${n.label}/`)),
            )?.id ??
            null;
        }
      }
      if (!target || !nodeIds.has(target) || target === fromNode) continue;
      const key = `${fromNode}->${target}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ from: fromNode, to: target });
    }
    if (edges.length >= LIMITS.maxGraphEdges) break;
  }

  return { nodes, edges, clusters, omittedModules };
}

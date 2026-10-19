import type { AnalysisContext } from "../context";

export interface DependencyEcosystem {
  name: string;
  manifestPath: string;
  /** total declared dependencies (direct where the format distinguishes) */
  count: number;
  /** up to 12 names, sorted, for evidence display */
  names: string[];
}

export interface DependencySignals {
  ecosystems: DependencyEcosystem[];
  /** union size across ecosystems */
  totalDirect: number;
  lockfiles: string[];
  hasLockfile: boolean;
  /** primary (first detected) ecosystem's pinning ratio, 0–1; null if unknown */
  pinnedRatio: number | null;
}

interface ManifestSpec {
  ecosystem: string;
  /** filename at repo root or workspace level */
  file: string;
  parse(content: string): { names: string[]; pinned: number; total: number };
}

const SPECS: ManifestSpec[] = [
  {
    ecosystem: "npm",
    file: "package.json",
    parse(content) {
      try {
        const pkg = JSON.parse(content) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
        const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
        const pinned = names.filter((n) => /^\d|^=|^v\d/.test(all[n] ?? "")).length;
        return { names, pinned, total: names.length };
      } catch {
        return { names: [], pinned: 0, total: 0 };
      }
    },
  },
  {
    ecosystem: "pip",
    file: "requirements.txt",
    parse(content) {
      const names = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#") && !l.startsWith("-"))
        .map((l) => l.split(/[=<>~!;[]/)[0].trim())
        .filter(Boolean);
      const pinned = content.split("\n").filter((l) => /^\s*[A-Za-z0-9_.-]+\s*==/.test(l)).length;
      return { names, pinned, total: names.length };
    },
  },
  {
    ecosystem: "pip",
    file: "pyproject.toml",
    // PEP 621: [project] dependencies = ["name>=1.0", "name[extra]<2"; markers]
    // Only the direct [project] dependencies are counted — optional groups,
    // build-system requirements and tool sections are deliberately excluded.
    parse(content) {
      const block = content.match(/^\[project\][\s\S]*?(?=^\[|\Z)/m);
      const src = block ? block[0] : content;
      const deps = src.match(/\bdependencies\s*=\s*(\[[\s\S]*?\])/);
      if (!deps) return { names: [], pinned: 0, total: 0 };
      // TOML allows both quote styles; the double-quoted alternative also
      // consumes single-quoted env markers nested inside a limit string.
      const raw = [...deps[1].matchAll(/"([^"]+)"|'([^']+)'/g)].map((m) => m[1] ?? m[2]);
      // strip extras, env markers, whitespace requirements, local paths
      const names = raw.map((r) => r.split(/[=<>!~;@\[\s]/)[0].trim()).filter((n) => /^[A-Za-z0-9_.-]+$/.test(n));
      const pinned = raw.filter((r) => /^[A-Za-z0-9_.-]+\s*==/.test(r)).length;
      return { names, pinned, total: names.length };
    },
  },
  {
    ecosystem: "cargo",
    file: "Cargo.toml",
    parse(content) {
      const names = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^\S+\s*=/.test(l) && !l.startsWith("[") && !l.startsWith("#"))
        .map((l) => l.split("=")[0].trim())
        .filter((n) => n && n !== "name" && n !== "version");
      const pinned = content.split("\n").filter((l) => /=\s*"?[\d]+\./.test(l)).length;
      return { names, pinned, total: names.length };
    },
  },
  {
    ecosystem: "go",
    file: "go.mod",
    parse(content) {
      const names: string[] = [];
      let inBlock = false;
      for (const line of content.split("\n")) {
        const t = line.trim();
        if (t === "require (") {
          inBlock = true;
          continue;
        }
        if (inBlock && t === ")") {
          inBlock = false;
          continue;
        }
        if (inBlock && t && !t.startsWith("//")) {
          names.push(t.split(/\s+/)[0]);
        } else if (!inBlock && /^require\s+\S/.test(t)) {
          names.push(t.split(/\s+/)[1]);
        }
      }
      return { names, pinned: names.length, total: names.length };
    },
  },
  {
    ecosystem: "maven",
    file: "pom.xml",
    parse(content) {
      const names = [...content.matchAll(/<artifactId>([^<]+)<\/artifactId>/g)].map((m) => m[1]);
      const pinned = [...content.matchAll(/<version>[^$<][^<]*<\/version>/g)].length;
      return { names: names.filter((n) => !["maven-compiler-plugin", "maven-surefire-plugin"].includes(n)), pinned, total: names.length };
    },
  },
  {
    ecosystem: "gradle",
    file: "build.gradle",
    parse(content) {
      const names = [...content.matchAll(/(?:implementation|api|testImplementation|runtimeOnly)\s+['"]([^'"]+)['"]/g)].map(
        (m) => m[1].split(":")[1] ?? m[1],
      );
      return { names, pinned: names.length, total: names.length };
    },
  },
  {
    ecosystem: "rubygems",
    file: "Gemfile",
    parse(content) {
      const names = [...content.matchAll(/^\s*gem\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
      return { names, pinned: 0, total: names.length };
    },
  },
  {
    ecosystem: "composer",
    file: "composer.json",
    parse(content) {
      try {
        const pkg = JSON.parse(content) as { require?: Record<string, string>; "require-dev"?: Record<string, string> };
        const names = [...Object.keys(pkg.require ?? {}), ...Object.keys(pkg["require-dev"] ?? {})];
        return { names, pinned: names.length, total: names.length };
      } catch {
        return { names: [], pinned: 0, total: 0 };
      }
    },
  },
];

const LOCKFILES = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "Cargo.lock",
  "go.sum",
  "poetry.lock",
  "uv.lock",
  "Gemfile.lock",
  "composer.lock",
];

export function extractDependencies(ctx: AnalysisContext): DependencySignals {
  const ecosystems: DependencyEcosystem[] = [];
  for (const spec of SPECS) {
    const entry = ctx.entries.find((e) => e.path === spec.file);
    if (!entry) continue;
    const content = ctx.fetched.get(spec.file);
    if (content === undefined) {
      // manifest present but not fetched (budget) — count it, no names
      ecosystems.push({ name: spec.ecosystem, manifestPath: spec.file, count: 0, names: [] });
      continue;
    }
    const { names, total } = spec.parse(content);
    ecosystems.push({
      name: spec.ecosystem,
      manifestPath: spec.file,
      count: total,
      names: [...names].sort().slice(0, 12),
    });
  }

  const lockfiles = LOCKFILES.filter((lf) => ctx.allEntries.some((e) => e.path === lf || e.path.endsWith(`/${lf}`)));
  const pkgJson = ctx.fetched.get("package.json");
  let pinnedRatio: number | null = null;
  if (pkgJson !== undefined) {
    const parsed = SPECS[0].parse(pkgJson);
    if (parsed.total > 0) pinnedRatio = Math.round((parsed.pinned / parsed.total) * 100) / 100;
  }

  return {
    ecosystems,
    totalDirect: ecosystems.reduce((n, e) => n + e.count, 0),
    lockfiles,
    hasLockfile: lockfiles.length > 0,
    pinnedRatio,
  };
}

/**
 * Extension → language mapping with byte-per-line estimation constants.
 * The bytes/line figures are rough per-language averages used ONLY for
 * deterministic LOC estimation of files whose content was not fetched;
 * files that were fetched use exact line counts. Estimates are always
 * labeled as such in evidence.
 */

export interface LanguageInfo {
  /** display name used across the UI */
  name: string;
  /** rough average bytes per source line, for LOC estimation */
  bytesPerLine: number;
  /** UI accent color */
  color: string;
}

const MAP: Record<string, LanguageInfo> = {
  ts: { name: "TypeScript", bytesPerLine: 32, color: "#8b8bf7" },
  mts: { name: "TypeScript", bytesPerLine: 32, color: "#8b8bf7" },
  cts: { name: "TypeScript", bytesPerLine: 32, color: "#8b8bf7" },
  tsx: { name: "TSX", bytesPerLine: 34, color: "#a5a5fa" },
  js: { name: "JavaScript", bytesPerLine: 30, color: "#e3d44d" },
  mjs: { name: "JavaScript", bytesPerLine: 30, color: "#e3d44d" },
  cjs: { name: "JavaScript", bytesPerLine: 30, color: "#e3d44d" },
  jsx: { name: "JSX", bytesPerLine: 32, color: "#efea8a" },
  py: { name: "Python", bytesPerLine: 28, color: "#5ec97c" },
  go: { name: "Go", bytesPerLine: 32, color: "#5fc9e8" },
  rs: { name: "Rust", bytesPerLine: 32, color: "#d19a66" },
  java: { name: "Java", bytesPerLine: 30, color: "#d98b6a" },
  kt: { name: "Kotlin", bytesPerLine: 30, color: "#c586c0" },
  swift: { name: "Swift", bytesPerLine: 30, color: "#e07a5f" },
  rb: { name: "Ruby", bytesPerLine: 28, color: "#d16a6a" },
  php: { name: "PHP", bytesPerLine: 28, color: "#8f8fbd" },
  c: { name: "C", bytesPerLine: 28, color: "#9db1c7" },
  h: { name: "C Header", bytesPerLine: 26, color: "#aebfd4" },
  cpp: { name: "C++", bytesPerLine: 30, color: "#7f9dc4" },
  cs: { name: "C#", bytesPerLine: 30, color: "#7ec97e" },
  sh: { name: "Shell", bytesPerLine: 26, color: "#89b482" },
  bash: { name: "Shell", bytesPerLine: 26, color: "#89b482" },
  sql: { name: "SQL", bytesPerLine: 26, color: "#c9a26d" },
  lua: { name: "Lua", bytesPerLine: 26, color: "#6a9fd8" },
  dart: { name: "Dart", bytesPerLine: 30, color: "#5fc9c9" },
  vue: { name: "Vue", bytesPerLine: 32, color: "#62c99a" },
  svelte: { name: "Svelte", bytesPerLine: 32, color: "#e07a3f" },
  scala: { name: "Scala", bytesPerLine: 30, color: "#c9656a" },
  ex: { name: "Elixir", bytesPerLine: 28, color: "#a077c9" },
  zig: { name: "Zig", bytesPerLine: 28, color: "#d8b36a" },
};

const FALLBACK: LanguageInfo = { name: "Other", bytesPerLine: 34, color: "#9a9a8f" };

export function languageForFile(path: string): LanguageInfo | null {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MAP[ext] ?? null;
}

export function languageInfoOrFallback(path: string): LanguageInfo {
  return languageForFile(path) ?? FALLBACK;
}

/** Canonical language palette entry, or a neutral gray for rare languages. */
export function languageColor(name: string): string {
  for (const info of Object.values(MAP)) {
    if (info.name === name) return info.color;
  }
  return "#9a9a8f";
}

export function isSourceLanguagePath(path: string): boolean {
  return languageForFile(path) !== null;
}

/**
 * Every performance budget in one place. The pipeline treats these as hard
 * caps: exceeding a budget degrades the scan to `partial` — it never
 * fabricates data to fill the gap (Phase-2 amendment #10).
 */
export const LIMITS = {
  /** GitHub's own cap for a recursive tree response (100k entries / 7 MB). */
  maxTreeEntries: 100_000,
  /** maximum number of file contents fetched via the blobs API */
  maxFilesFetched: 24,
  /** maximum byte size of a single fetched file */
  maxFileBytes: 256 * 1024,
  /** maximum combined byte size of all fetched content */
  maxTotalContentBytes: 3 * 1024 * 1024,
  /** parallel blob fetches */
  maxConcurrency: 6,
  /** per-request GitHub timeout */
  requestTimeoutMs: 8_000,
  /** hard deadline for the whole pipeline; overflow degrades to partial */
  pipelineDeadlineMs: 25_000,
  /** UI graph caps — a small accurate graph beats a large unreliable one */
  maxGraphNodes: 24,
  maxGraphEdges: 40,
  /** issue cap after sorting */
  maxIssues: 24,
  /** file-tree nodes sent to the UI */
  maxTreeNodes: 400,
  /** max children rendered per directory in the UI tree */
  maxTreeChildrenPerDir: 40,
} as const;

/** Directories never inspected or counted (build output, vendored code, VCS). */
export const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "vendor",
  "target",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
  ".gradle",
  ".idea",
  ".vscode",
  ".github", // CI metadata is tracked separately, not as source
]);

/** Extensions treated as binary — never fetched, excluded from LOC. */
export const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "tiff", "svgz",
  "woff", "woff2", "ttf", "otf", "eot",
  "mp3", "mp4", "webm", "mov", "avi", "wav", "ogg",
  "zip", "tar", "gz", "bz2", "7z", "rar", "jar", "war", "class",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "exe", "dll", "so", "dylib", "bin", "dat", "pdb",
  "wasm", "pyc", "pyo", "o", "a", "lib",
  "db", "sqlite", "sqlite3", "parquet", "feather",
]);

/** Extensions that still count as text but are not "source code". */
export const NON_SOURCE_EXTENSIONS = new Set([
  "md", "mdx", "txt", "rst", "adoc",
  "json", "jsonc", "yaml", "yml", "toml", "ini", "cfg", "conf", "env", "properties",
  "xml", "html", "css", "scss", "sass", "less",
  "lock", "sum", "mod",
]);

/** Filenames that look like they may contain credentials. */
export const SECRET_LIKE_FILENAMES = [
  /^id_rsa(\.\d+)?$/,
  /^id_dsa(\.\d+)?$/,
  /^id_ecdsa(\.\d+)?$/,
  /^id_ed25519(\.\d+)?$/,
  /\.pem$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /\.key$/i,
  /\.keystore$/i,
  /\.jks$/i,
  /^credentials(\.json)?$/i,
  /^secrets?\.(json|ya?ml|txt)$/i,
  /\.htpasswd$/i,
  /^\.npmrc$/,
];

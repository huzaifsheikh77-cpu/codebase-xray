import type { AnalysisContext } from "../context";
import { fileName, pathDepth } from "../tree-utils";

export interface DocumentationSignals {
  readme: { present: boolean; path: string | null; bytes: number };
  contributing: boolean;
  /** license file present in the tree */
  licenseFile: string | null;
  /** license declared in repo metadata (may differ) */
  licenseDeclared: string | null;
  docsDirectory: string | null;
  /** API doc artifacts: OpenAPI/Swagger/GraphQL schema files */
  apiDocs: string[];
  envExample: string | null;
  securityPolicy: boolean;
  codeOfConduct: boolean;
  totalMdFiles: number;
}

export function extractDocumentation(ctx: AnalysisContext): DocumentationSignals {
  let readme: DocumentationSignals["readme"] = { present: false, path: null, bytes: 0 };
  let contributing = false;
  let licenseFile: string | null = null;
  let docsDirectory: string | null = null;
  const apiDocs: string[] = [];
  let envExample: string | null = null;
  let securityPolicy = false;
  let codeOfConduct = false;
  let totalMdFiles = 0;

  for (const entry of ctx.allEntries) {
    if (entry.type !== "blob") continue;
    const base = fileName(entry.path).toLowerCase();
    const depth = pathDepth(entry.path);

    if (base.endsWith(".md") || base.endsWith(".mdx")) totalMdFiles++;

    if (depth === 0 && /^readme(\.md|\.rst|\.txt)?$/.test(base)) {
      readme = { present: true, path: entry.path, bytes: entry.size ?? 0 };
    }
    if (depth === 0 && /^contributing(\.md)?$/.test(base)) contributing = true;
    if (depth === 0 && /^(license|licence)(\.md|\.txt)?$/.test(base)) licenseFile = entry.path;
    if (depth === 0 && /^security(\.md)?$/.test(base)) securityPolicy = true;
    if (depth === 0 && /^code_of_conduct(\.md)?$/.test(base)) codeOfConduct = true;
    if (depth <= 1 && /^\.env\.example$/.test(base)) envExample = entry.path;
    if (/^(docs|documentation)(\/|$)/.test(entry.path) && docsDirectory === null) docsDirectory = entry.path.split("/")[0];
    if (/openapi|swagger|schema\.graphql|\.proto$/i.test(base) && !base.endsWith(".md")) {
      if (apiDocs.length < 8) apiDocs.push(entry.path);
    }
  }

  return {
    readme,
    contributing,
    licenseFile,
    licenseDeclared: ctx.repo.licenseSpdx,
    docsDirectory,
    apiDocs: apiDocs.sort(),
    envExample,
    securityPolicy,
    codeOfConduct,
    totalMdFiles,
  };
}

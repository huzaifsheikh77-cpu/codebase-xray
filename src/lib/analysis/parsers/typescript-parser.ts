import ts from "typescript";
import type {
  ParsedClass,
  ParsedFile,
  ParsedFunction,
  ParsedImport,
  LanguageParser,
} from "./types";
import { emptyParsedFile, languageOfPath, lineCount, scanTodos } from "./common";

/**
 * TYPESCRIPT / JAVASCRIPT PARSER — real syntax tree via the TypeScript
 * compiler API (`ts.createSourceFile`).
 *
 * This replaces regex import matching for the ecosystem the analyzer sees
 * most. It extracts:
 *   - static imports / re-exports, dynamic `import()`, `require()`
 *   - exported symbols
 *   - function/method spans, parameter counts
 *   - cyclomatic complexity per function (1 + decision points)
 *   - class spans and method counts
 *
 * It never executes repository code: `createSourceFile` only tokenises and
 * parses text in memory.
 */

function scriptKind(path: string): ts.ScriptKind {
  const lower = path.toLowerCase();
  if (lower.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (lower.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (lower.endsWith(".js") || lower.endsWith(".mjs") || lower.endsWith(".cjs")) return ts.ScriptKind.JS;
  if (lower.endsWith(".json")) return ts.ScriptKind.JSON;
  return ts.ScriptKind.TS;
}

/** Count decision points inside a function body (classic cyclomatic proxy). */
function complexityOf(node: ts.Node): number {
  let complexity = 1;
  const visit = (n: ts.Node): void => {
    switch (n.kind) {
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.CaseClause:
      case ts.SyntaxKind.CatchClause:
      case ts.SyntaxKind.ConditionalExpression:
        complexity++;
        break;
      case ts.SyntaxKind.BinaryExpression: {
        const operator = (n as ts.BinaryExpression).operatorToken.kind;
        if (
          operator === ts.SyntaxKind.AmpersandAmpersandToken ||
          operator === ts.SyntaxKind.BarBarToken ||
          operator === ts.SyntaxKind.QuestionQuestionToken
        ) {
          complexity++;
        }
        break;
      }
      default:
        break;
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return complexity;
}

function hasExportModifier(node: ts.Node): boolean {
  const withModifiers = node as ts.Node & { modifiers?: ts.NodeArray<ts.ModifierLike> };
  return Boolean(withModifiers.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

export const typescriptParser: LanguageParser = {
  id: "typescript",
  label: "TypeScript compiler API",
  ast: true,
  capability: "Full syntax tree: imports, exports, function spans, cyclomatic complexity, classes.",

  supports(path: string): boolean {
    return /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/i.test(path);
  },

  parse(path: string, content: string): ParsedFile {
    const file = emptyParsedFile(path, languageOfPath(path) ?? "TypeScript", "typescript");
    file.loc = lineCount(content);
    file.todos = scanTodos(content);

    let source: ts.SourceFile;
    try {
      source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, scriptKind(path));
    } catch (error) {
      file.ok = false;
      file.error = error instanceof Error ? error.name : "parse failure";
      return file;
    }

    const diagnostics = (source as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics;
    if (Array.isArray(diagnostics) && diagnostics.length > 0) {
      // Recovered with syntax errors — keep whatever structure we found and
      // say so; a broken file must not silently look clean.
      file.ok = false;
      file.error = `${diagnostics.length} syntax diagnostic(s)`;
    }

    const lineAt = (n: ts.Node): number => {
      try {
        return source.getLineAndCharacterOfPosition(n.getStart(source)).line + 1;
      } catch {
        return 1;
      }
    };
    const endLineAt = (n: ts.Node): number => {
      try {
        return source.getLineAndCharacterOfPosition(n.getEnd()).line + 1;
      } catch {
        return lineAt(n);
      }
    };

    const imports: ParsedImport[] = [];
    const functions: ParsedFunction[] = [];
    const classes: ParsedClass[] = [];
    const exports: string[] = [];

    const addFunction = (n: ts.FunctionLikeDeclaration & { name?: ts.Node }, method: boolean): void => {
      const start = lineAt(n);
      const end = endLineAt(n);
      const nameNode = n.name;
      const name =
        nameNode && ts.isIdentifier(nameNode)
          ? nameNode.text
          : method
            ? "(method)"
            : "(anonymous)";
      if (functions.length >= 400) return;
      functions.push({
        name,
        line: start,
        endLine: end,
        lines: Math.max(1, end - start + 1),
        params: n.parameters.length,
        complexity: complexityOf(n),
        async: Boolean((n as ts.FunctionDeclaration).modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)),
        method: method || undefined,
      });
    };

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push({
          specifier: node.moduleSpecifier.text,
          kind: "static",
          line: lineAt(node),
          typeOnly: Boolean(node.importClause?.isTypeOnly) || undefined,
        });
      } else if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        imports.push({
          specifier: node.moduleSpecifier.text,
          kind: "static",
          line: lineAt(node),
          typeOnly: Boolean(node.isTypeOnly) || undefined,
        });
      } else if (ts.isCallExpression(node)) {
        const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
        const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
        const first = node.arguments[0];
        if ((isDynamicImport || isRequire) && first && ts.isStringLiteralLike(first)) {
          imports.push({
            specifier: first.text,
            kind: isDynamicImport ? "dynamic" : "require",
            line: lineAt(node),
          });
        }
      } else if (ts.isFunctionDeclaration(node) && node.body) {
        addFunction(node, false);
        if (hasExportModifier(node) && node.name) exports.push(node.name.text);
      } else if (ts.isMethodDeclaration(node) && node.body) {
        addFunction(node, true);
      } else if (ts.isClassDeclaration(node)) {
        const name = node.name?.text ?? "(anonymous class)";
        const start = lineAt(node);
        const end = endLineAt(node);
        const methods = node.members.filter((m) => ts.isMethodDeclaration(m)).length;
        if (classes.length < 100) {
          classes.push({ name, line: start, endLine: end, lines: Math.max(1, end - start + 1), methods });
        }
        if (hasExportModifier(node) && node.name) exports.push(node.name.text);
      } else if (ts.isVariableStatement(node)) {
        const exported = hasExportModifier(node);
        for (const decl of node.declarationList.declarations) {
          if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
            addFunction(decl.initializer as unknown as ts.FunctionLikeDeclaration, false);
          }
          if (exported && ts.isIdentifier(decl.name)) exports.push(decl.name.text);
        }
      } else if (ts.isExportAssignment(node)) {
        // export default <expression> — nothing structural to add
      }
      ts.forEachChild(node, visit);
    };

    visit(source);

    file.imports = imports;
    file.functions = functions;
    file.classes = classes;
    file.exports = [...new Set(exports)];
    return file;
  },
};

import type { RepoAnalysis } from "@/lib/types/analysis";

export type AiTask = "explain-issue" | "explain-architecture" | "chat" | "recommendations";

/** Presentation levels over the SAME evidence — not different engines. */
export type ExplanationLevel = "beginner" | "developer" | "engineering";

export interface AiCitation {
  path?: string;
  line?: number;
  issueId?: string;
  note?: string;
}

export interface AiAnswer {
  summary: string;
  explanation: string;
  citations: AiCitation[];
  confidence: "high" | "medium" | "low";
  /**
   * Where the answer comes from. The assistant has NO source-code access, so
   * it can never return "source" — explanations rest on analysis evidence or
   * are explicitly inferences/general advice.
   */
  grounding: "evidence" | "inferred" | "general";
  limitations: string[];
  /** evidence that would be required to answer further (uninspected areas) */
  requiresMoreInspection: string[];
  suggestedActions: string[];
}

export interface AiRequest {
  task: AiTask;
  /** the analysis object already held by the browser — re-validated server-side */
  analysis: RepoAnalysis;
  question?: string;
  issueId?: string;
  level?: ExplanationLevel;
}

export type AiFailureCode =
  | "AI_UNAVAILABLE"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_ERROR"
  | "AI_INVALID_RESPONSE"
  | "AI_INVALID_ANALYSIS"
  | "AI_BUDGET_EXCEEDED";

export type AiEnvelope =
  | {
      ok: true;
      answer: AiAnswer;
      meta: {
        provider: string;
        model: string | null;
        /** citations the validator removed because they referenced unknown evidence */
        rejectedCitations: number;
        level: ExplanationLevel;
      };
    }
  | { ok: false; code: AiFailureCode; message: string };

/** Compact, evidence-derived projection of a scan. Never raw repository code. */
export interface RepoBrief {
  repo: {
    slug: string;
    description: string;
    defaultBranch: string;
    stars: number;
    license: string;
    pushedAt: string;
  };
  scan: {
    engineVersion: string;
    scoringVersion?: string;
    isDemoData: boolean;
    partial: boolean;
    warnings: string[];
    coverage?: {
      inspectedFiles: number;
      eligibleFiles: number;
      inspectedPct: number;
      parsedFiles: number;
      unresolvedImports: number;
    };
  };
  stats: {
    totalFiles: number;
    linesOfCode: number;
    sourceFiles: number;
    testFiles: number;
    languages: { name: string; pct: number }[];
  };
  scores: {
    overall: number;
    sectors: { id: string; label: string; value: number; confidence?: string; explanation: string }[];
  };
  architecture: {
    pattern?: string;
    confidence?: string;
    evidence: string[];
    topDirectories: string[];
    modules: { id: string; label: string; kind: string }[];
    edgeCount: number;
    unresolvedImports: number;
  };
  issues: {
    id: string;
    title: string;
    severity: string;
    category?: string;
    confidence?: string;
    file?: string;
    line?: number;
    detail: string;
    evidence: string[];
    recommendation?: string;
  }[];
  /** files that appear in evidence — the ONLY paths the model may cite */
  knownPaths: string[];
}

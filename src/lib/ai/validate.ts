import type { AiAnswer, AiCitation, RepoBrief } from "./types";

/**
 * RESPONSE VALIDATION.
 *
 * A model answer is untrusted input. This module:
 *   - parses strict JSON (tolerating a fenced block),
 *   - clamps every field length,
 *   - DROPS citations that reference paths or finding IDs not present in the
 *     brief, and reports how many were rejected,
 *   - forces `confidence` into the allowed vocabulary.
 *
 * Rejected citations are surfaced to the user rather than silently kept.
 */

const MAX_SUMMARY = 240;
const MAX_EXPLANATION = 2_400;
const MAX_ACTIONS = 6;
const MAX_LIMITATIONS = 6;

export class InvalidAiResponse extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAiResponse";
  }
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function stringList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .slice(0, maxItems)
    .map((v) => v.trim().slice(0, maxLen));
}

export function parseAnswer(raw: string, brief: RepoBrief): { answer: AiAnswer; rejectedCitations: number } {
  let textPayload = raw.trim();
  if (textPayload.startsWith("```")) {
    textPayload = textPayload.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textPayload);
  } catch {
    throw new InvalidAiResponse("The model did not return valid JSON.");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new InvalidAiResponse("The model returned a non-object response.");
  }

  const obj = parsed as Record<string, unknown>;
  const summary = text(obj.summary, MAX_SUMMARY);
  const explanation = text(obj.explanation, MAX_EXPLANATION);
  if (summary.length === 0 && explanation.length === 0) {
    throw new InvalidAiResponse("The model returned an empty answer.");
  }

  const knownPaths = new Set(brief.knownPaths);
  const knownIssueIds = new Set(brief.issues.map((i) => i.id));
  const rawCitations = Array.isArray(obj.citations) ? obj.citations : [];
  const citations: AiCitation[] = [];
  let rejected = 0;

  for (const entry of rawCitations.slice(0, 10)) {
    if (typeof entry !== "object" || entry === null) {
      rejected++;
      continue;
    }
    const c = entry as Record<string, unknown>;
    const path = typeof c.path === "string" ? c.path : undefined;
    const issueId = typeof c.issueId === "string" ? c.issueId : undefined;
    const line = typeof c.line === "number" && Number.isInteger(c.line) && c.line > 0 ? c.line : undefined;

    const pathOk = path === undefined || knownPaths.has(path);
    const issueOk = issueId === undefined || knownIssueIds.has(issueId);
    if (!pathOk || !issueOk) {
      rejected++;
      continue;
    }
    if (!path && !issueId) {
      rejected++;
      continue;
    }
    citations.push({
      ...(path ? { path } : {}),
      ...(issueId ? { issueId } : {}),
      ...(line ? { line } : {}),
      ...(typeof c.note === "string" ? { note: c.note.slice(0, 160) } : {}),
    });
  }

  const confidenceRaw = typeof obj.confidence === "string" ? obj.confidence.toLowerCase() : "low";
  const confidence = confidenceRaw === "high" || confidenceRaw === "medium" ? confidenceRaw : "low";

  // The assistant never has source access, so "source" is not an accepted
  // grounding value even if a model tries to claim it.
  const groundingRaw = typeof obj.grounding === "string" ? obj.grounding.toLowerCase() : "inferred";
  const grounding =
    groundingRaw === "evidence" || groundingRaw === "general" ? groundingRaw : "inferred";

  return {
    answer: {
      summary,
      explanation,
      citations,
      confidence,
      grounding,
      limitations: stringList(obj.limitations, MAX_LIMITATIONS, 220),
      requiresMoreInspection: stringList(obj.requiresMoreInspection, 4, 180),
      suggestedActions: stringList(obj.suggestedActions, MAX_ACTIONS, 220),
    },
    rejectedCitations: rejected,
  };
}

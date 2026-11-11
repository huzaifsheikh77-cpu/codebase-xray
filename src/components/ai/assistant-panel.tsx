"use client";

import { useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { SectionShell } from "@/components/ui/section-shell";
import { DemoBadge } from "@/components/ui/demo-badge";
import type { AiAnswer, AiEnvelope, AiTask, ExplanationLevel } from "@/lib/ai/types";
import type { RepoAnalysis } from "@/lib/types/analysis";

const LEVELS: { id: ExplanationLevel; label: string }[] = [
  { id: "beginner", label: "BEGINNER" },
  { id: "developer", label: "DEVELOPER" },
  { id: "engineering", label: "ENGINEERING" },
];

const TASKS: { id: AiTask; label: string }[] = [
  { id: "chat", label: "ASK" },
  { id: "explain-issue", label: "EXPLAIN FINDING" },
  { id: "explain-architecture", label: "ARCHITECTURE" },
  { id: "recommendations", label: "PLAN" },
];

/**
 * /09 — AI ASSISTANT (optional layer).
 *
 * The assistant explains the deterministic analysis. It is never used to
 * produce measurements. When no provider is configured the panel is
 * explicitly disabled and explains how to enable it — it does not simulate
 * an answer.
 */
export function AssistantPanel({ analysis }: { analysis: RepoAnalysis }) {
  const status = analysis.analysis.ai;
  const available = Boolean(status?.available);

  const [task, setTask] = useState<AiTask>("chat");
  const [level, setLevel] = useState<ExplanationLevel>("developer");
  const [question, setQuestion] = useState("");
  const [issueId, setIssueId] = useState(analysis.issues[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState(0);

  const ask = async () => {
    setLoading(true);
    setError(null);
    setAnswer(null);
    setRejected(0);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          analysis,
          level,
          question: task === "chat" ? question : undefined,
          issueId: task === "explain-issue" ? issueId : undefined,
        }),
      });
      const payload = (await response.json()) as AiEnvelope;
      if (payload.ok) {
        setAnswer(payload.answer);
        setRejected(payload.meta.rejectedCitations);
      } else {
        setError(payload.message);
      }
    } catch {
      setError("Could not reach the assistant endpoint. The deterministic report is unaffected.");
    } finally {
      setLoading(false);
    }
  };

  const disabled = !available || loading;

  return (
    <SectionShell
      id="assistant"
      number="09"
      title="AI Assistant"
      meta={
        <span className="flex items-center gap-2">
          <DemoBadge />
          <span>{available ? `READY — ${status?.model ?? "MODEL"}` : "DISABLED — NOT CONFIGURED"}</span>
        </span>
      }
    >
      {!available ? (
        <div className="border border-dashed border-line-strong bg-paper px-6 py-10">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.18em]">
            <Bot className="size-4 text-muted" aria-hidden />
            ASSISTANT OFFLINE
          </div>
          <p className="mt-3 max-w-2xl font-mono text-[11px] leading-relaxed text-muted">
            {status?.reason ??
              "No AI provider is configured. The deterministic analysis above is complete and unaffected by this — the assistant only explains findings, it never produces them."}
          </p>
          <div className="mt-4 border-t border-dashed border-line-strong pt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-muted">
            TO ENABLE: SET <span className="text-violet">AI_API_KEY</span> ON THE SERVER.
            <br />
            OPTIONAL: <span className="text-violet">AI_MODEL</span> (DEFAULT gpt-4o-mini) ·{" "}
            <span className="text-violet">AI_BASE_URL</span> (ANY OPENAI-COMPATIBLE ENDPOINT).
            <br />
            THE KEY IS SERVER-ONLY AND IS NEVER SENT TO THE BROWSER.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <Panel label="REQUEST" meta={`${status?.provider?.toUpperCase() ?? "PROVIDER"} · ${level.toUpperCase()}`}>
            <div className="space-y-3 px-4 py-3">
              <div>
                <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">TASK</p>
                <div className="flex flex-wrap gap-1.5">
                  {TASKS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTask(t.id)}
                      aria-pressed={task === t.id}
                      className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] focus-visible:outline-acid ${
                        task === t.id ? "border-ink bg-acid text-ink" : "border-line-strong bg-paper text-muted hover:border-ink"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">EXPLANATION LEVEL</p>
                <div className="flex flex-wrap gap-1.5">
                  {LEVELS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLevel(l.id)}
                      aria-pressed={level === l.id}
                      className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] focus-visible:outline-acid ${
                        level === l.id ? "border-ink bg-acid text-ink" : "border-line-strong bg-paper text-muted hover:border-ink"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {task === "explain-issue" && (
                <div>
                  <label htmlFor="ai-issue" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                    FINDING
                  </label>
                  <select
                    id="ai-issue"
                    value={issueId}
                    onChange={(e) => setIssueId(e.target.value)}
                    className="w-full border border-line-strong bg-paper px-2 py-2 font-mono text-[10px] text-ink focus-visible:outline-acid"
                  >
                    {analysis.issues.map((issue) => (
                      <option key={issue.id} value={issue.id}>
                        {issue.id} — {issue.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {task === "chat" && (
                <div>
                  <label htmlFor="ai-question" className="mb-1.5 block font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                    QUESTION
                  </label>
                  <textarea
                    id="ai-question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value.slice(0, 600))}
                    rows={4}
                    placeholder="Where is the highest technical debt, and why?"
                    className="w-full resize-y border border-line-strong bg-paper px-2 py-2 font-mono text-[11px] text-ink placeholder:text-muted/70 focus-visible:outline-acid"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={ask}
                disabled={disabled || (task === "chat" && question.trim().length === 0)}
                className="flex w-full items-center justify-center gap-2 border border-ink bg-acid px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] disabled:opacity-40 focus-visible:outline-acid"
              >
                <Send className="size-3.5" aria-hidden />
                {loading ? "ASKING…" : "ASK ASSISTANT"}
              </button>
              <p className="font-mono text-[9px] leading-relaxed text-muted">
                ONLY THE ANALYSIS SUMMARY IS SENT. NO SOURCE FILES, TOKENS OR IP ADDRESSES LEAVE THE SERVER.
              </p>
            </div>
          </Panel>

          <Panel
            label="ANSWER"
            meta={
              answer
                ? `${answer.confidence.toUpperCase()} CONFIDENCE · ${answer.grounding.toUpperCase()}`
                : "AWAITING REQUEST"
            }
          >
            <div className="px-4 py-4">
              {error && (
                <p role="alert" className="border border-critical bg-paper px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-critical">
                  {error}
                </p>
              )}

              {!error && !answer && !loading && (
                <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-muted">
                  THE ASSISTANT EXPLAINS FINDINGS FROM THE EVIDENCE ABOVE. IT CANNOT MEASURE, SCAN OR MODIFY THE REPOSITORY.
                </p>
              )}

              {loading && (
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  REQUESTING EXPLANATION — DETERMINISTIC RESULTS REMAIN AVAILABLE.
                </p>
              )}

              {answer && (
                <div className="space-y-4">
                  <div className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-violet" aria-hidden />
                    <div>
                      <h3 className="text-base font-bold leading-snug">{answer.summary}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{answer.explanation}</p>
                    </div>
                  </div>

                  {answer.citations.length > 0 && (
                    <div>
                      <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-violet">CITATIONS</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {answer.citations.map((c, i) => (
                          <li
                            key={i}
                            className="border border-line-strong bg-bg px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink"
                          >
                            {c.issueId ?? c.path}
                            {c.line ? `:${c.line}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {rejected > 0 && (
                    <p className="border border-violet/40 bg-violet/5 px-3 py-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-violet">
                      {rejected} CITATION(S) WERE REMOVED BECAUSE THEY REFERENCED EVIDENCE NOT PRESENT IN THIS SCAN.
                    </p>
                  )}

                  {answer.suggestedActions.length > 0 && (
                    <div className="border-l-2 border-acid bg-acid/10 px-3 py-2">
                      <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em]">SUGGESTED NEXT STEPS</p>
                      <ul className="space-y-1">
                        {answer.suggestedActions.map((action) => (
                          <li key={action} className="text-xs leading-relaxed">
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {answer.requiresMoreInspection.length > 0 && (
                    <div className="border border-dashed border-line-strong px-3 py-2">
                      <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted">
                        REQUIRES MORE INSPECTION
                      </p>
                      <ul className="space-y-1">
                        {answer.requiresMoreInspection.map((item) => (
                          <li key={item} className="font-mono text-[10px] leading-relaxed text-muted">
                            ▪ {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {answer.limitations.length > 0 && (
                    <div>
                      <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted">LIMITATIONS</p>
                      <ul className="space-y-1">
                        {answer.limitations.map((limitation) => (
                          <li key={limitation} className="font-mono text-[10px] leading-relaxed text-muted">
                            ▪ {limitation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}
    </SectionShell>
  );
}

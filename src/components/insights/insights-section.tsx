"use client";

import { Sparkles } from "lucide-react";
import { SectionShell } from "@/components/ui/section-shell";
import { DemoBadge, useAnalysisMode } from "@/components/ui/demo-badge";
import type { RepoAnalysis } from "@/lib/types/analysis";

export function InsightsSection({ insights }: { insights: RepoAnalysis["insights"] }) {
  const isDemo = useAnalysisMode();
  return (
    <SectionShell
      id="insights"
      number="06"
      title="AI Insights"
      meta={
        <span className="flex items-center gap-2">
          <DemoBadge />
          <span>RULE-BASED HEURISTICS — NO MODEL OUTPUT IN THIS PHASE</span>
        </span>
      }
    >
      <p className="mb-6 max-w-2xl font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
        {isDemo
          ? "DEMO AI INSIGHTS · GENERATED FROM THE MOCK PAYLOAD — A LIVE MODEL WILL REPLACE THESE IN A LATER PHASE"
          : "HEURISTIC INSIGHTS · DERIVED FROM THE LIVE SCAN BY DETERMINISTIC RULES — NO MODEL OUTPUT"}
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((ins, i) => (
          <article key={ins.id} className="relative border border-line bg-paper px-4 py-4">
            <span aria-hidden className="absolute -left-px -top-px size-1.5 bg-violet" />
            <header className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
              <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-violet">
                <Sparkles className="size-3" aria-hidden />
                AI INSIGHT /{String(i + 1).padStart(2, "0")}
              </span>
              <span className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                {ins.tag}
              </span>
            </header>
            <h3 className="mt-3 text-base font-bold leading-snug">{ins.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">{ins.explanation}</p>
            <div className="mt-3 border-t border-dashed border-line-strong pt-2.5">
              <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted">EVIDENCE</p>
              <ul className="space-y-1">
                {ins.evidence.map((ev, j) => (
                  <li key={j} className="flex gap-1.5 font-mono text-[10px] leading-relaxed">
                    <span aria-hidden className="text-violet">▪</span>
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3 border-l-2 border-acid bg-acid/10 px-3 py-2">
              <p className="text-xs leading-relaxed">{ins.recommendation}</p>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

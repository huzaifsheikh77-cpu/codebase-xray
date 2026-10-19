"use client";

import { createContext, useContext } from "react";

/**
 * Analysis mode context — lets any panel render DEMO vs LIVE labels from
 * `analysis.isDemoData` without prop-drilling. Defaults to DEMO so the
 * bundled mock always reads correctly.
 */
const AnalysisModeContext = createContext<boolean>(true);

export function AnalysisModeProvider({ isDemo, children }: { isDemo: boolean; children: React.ReactNode }) {
  return <AnalysisModeContext.Provider value={isDemo}>{children}</AnalysisModeContext.Provider>;
}

export function useAnalysisMode(): boolean {
  return useContext(AnalysisModeContext);
}

interface DemoBadgeProps {
  className?: string;
}

/** Small DEMO/LIVE chip placed on result panels. */
export function DemoBadge({ className }: DemoBadgeProps) {
  const isDemo = useAnalysisMode();
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${
        isDemo ? "border-violet bg-violet/5 text-violet" : "border-acid bg-acid/10 text-ink"
      } ${className ?? ""}`}
    >
      <span className={`inline-block size-1 ${isDemo ? "bg-violet" : "bg-acid"}`} aria-hidden />
      {isDemo ? "DEMO DATA" : "LIVE DATA"}
    </span>
  );
}

/** Full-width banner pinned above the results. */
export function DemoBanner({ analysis }: { analysis: { repo: { slug: string }; analysis: { scanId: string; durationMs: number } } }) {
  const isDemo = useAnalysisMode();
  return (
    <div className={`border-b border-line px-5 py-2 md:px-10 ${isDemo ? "bg-violet/5" : "bg-acid/10"}`}>
      <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${isDemo ? "text-violet" : "text-ink"}`}>
        {isDemo
          ? `SIMULATED ANALYSIS — THIS IS A FICTIONAL DEMO REPOSITORY · SCAN ${analysis.analysis.scanId} · NO LIVE REPOSITORY WAS CONTACTED`
          : `LIVE ANALYSIS — GITHUB ${analysis.repo.slug.toUpperCase()} · SCAN ${analysis.analysis.scanId} · ${analysis.analysis.durationMs}MS · GITHUB REST API`}
      </p>
    </div>
  );
}

/**
 * Partial-analysis notice — shows only when the scan degraded (budget,
 * deadline, rate limit, truncated tree). Every warning is verbatim from the
 * engine; results from a partial scan never imply full coverage.
 */
export function PartialBanner({ analysis }: { analysis: { analysis: { partial?: boolean; warnings?: string[] } } }) {
  if (!analysis.analysis.partial) return null;
  return (
    <div className="border-b border-line bg-violet/5 px-5 py-2 md:px-10">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-violet">
        ⚠ PARTIAL ANALYSIS — SEE ENGINES BELOW; METRICS DO NOT COVER THE ENTIRE REPOSITORY
      </p>
      {(analysis.analysis.warnings ?? []).length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {analysis.analysis.warnings!.map((w) => (
            <li key={w} className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              &gt; {w}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

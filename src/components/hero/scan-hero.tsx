"use client";

import { RepoForm } from "./repo-form";
import { ScanOverlay } from "./scan-overlay";
import { MonoLabel } from "@/components/ui/mono-label";
import type { ScanPhase } from "@/lib/types/analysis";
import type { ScanStage } from "@/lib/types/analysis";

interface ScanHeroProps {
  phase: ScanPhase;
  repoInput: string;
  onRepoInput: (v: string) => void;
  onAnalyze: (url: string) => void;
  stages: ScanStage[];
  stageIndex: number;
  progress: number;
  elapsedMs: number;
  demoSlug: string;
  /** current analysis mode — drives transcript metadata only */
  mode?: "demo" | "live";
}

/** /01 — hero with glitch title, form, and scan readout. */
export function ScanHero(props: ScanHeroProps) {
  const scanning = props.phase === "scanning";
  const mode = props.mode ?? "demo";
  const live = mode === "live";

  return (
    <section id="analyze" data-section="analyze" className="scanlines tech-grid relative border-b border-line-strong px-5 pb-16 pt-28 md:px-10 md:pb-24 md:pt-36">
      <div className="relative">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <MonoLabel tick>CODEBASE X-RAY — PUBLIC REPOSITORY ANALYZER</MonoLabel>
          <span className="border border-line-strong px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
            ENGINE v2.7.3
          </span>
          <span className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] ${live ? "border-acid text-ink" : "border-violet text-violet"}`}>
            {live ? "LIVE MODE" : "DEMO MODE"}
  </span>
        </div>

        <h1 className="font-display text-[clamp(3.5rem,12vw,9rem)] font-bold uppercase leading-[0.9] tracking-tight">
          CODEBASE
          <br />
          <span className="glitch" data-text="X-RAY_">
            X-RAY_
          </span>
        </h1>

        <p className="mt-6 max-w-xl font-mono text-sm uppercase tracking-[0.22em] text-muted">
          SCAN. ANALYZE. UNDERSTAND.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="mb-6 max-w-md text-sm leading-relaxed text-muted">
              Enter a public GitHub repository to generate an engineering-health
              analysis: structure, architecture, quality, security, testing and
              maintainability — scored, evidenced and mapped.
            </p>
            <RepoForm onAnalyze={(url) => props.onAnalyze(url)} disabled={scanning} />
          </div>

          <div>
            {scanning ? (
              <ScanOverlay stageIndex={props.stageIndex} progress={props.progress} elapsedMs={props.elapsedMs} stages={props.stages} />
            ) : (
              <div className="border border-line-strong bg-paper">
                <div className="border-b border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  REPOSITORY TRANSCRIPT
                </div>
                <div className="px-4 py-4 font-mono text-[11px] leading-7">
                  <p><span className="text-muted">target</span> <span className="text-violet">::</span> {props.repoInput || "—"}</p>
                  <p><span className="text-muted">status</span> <span className="text-violet">::</span> {props.phase === "complete" ? "ANALYSIS COMPLETE" : "AWAITING INPUT"}</p>
                  <p><span className="text-muted">source</span> <span className="text-violet">::</span> {live ? "GITHUB REST API (SERVER-SIDE)" : `${props.demoSlug} (FICTIONAL)`}</p>
                  <p><span className="text-muted">engine</span> <span className="text-violet">::</span> xray.engine v2.7.3</p>
                  <p><span className="text-muted">network</span> <span className="text-violet">::</span> {live ? "GITHUB API — NO REPO CODE EXECUTED" : "NO OUTBOUND REQUESTS"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

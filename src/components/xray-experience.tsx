"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/navigation/top-bar";
import { ScanHero } from "@/components/hero/scan-hero";
import { PresentationLayer } from "@/components/presentation-layer";
import { AnalysisModeProvider, DemoBanner } from "@/components/ui/demo-badge";
import { SiteFooter } from "@/components/layout/site-footer";
import { ErrorState } from "@/components/ui/error-state";
import { useScrollSpy } from "@/components/navigation/section-nav";
import { SCAN_STAGES } from "@/lib/mock/scan-stages";
import { MOCK_ANALYSIS } from "@/lib/mock/repo-analysis";
import type { AnalysisError, RepoAnalysis, ScanPhase } from "@/lib/types/analysis";

const TOTAL_SCAN_MS = 6200; // within the required 5–7s window

/** Normalized per-stage durations from stage weights. */
const STAGE_DURATIONS = (() => {
  const total = SCAN_STAGES.reduce((acc, s) => acc + s.weight, 0);
  return SCAN_STAGES.map((s) => (s.weight / total) * TOTAL_SCAN_MS);
})();

const SECTION_IDS = ["sys", "analyze", "score", "structure", "map", "issues", "insights", "status"];

/** The fictional demo repo runs offline on the bundled mock payload. */
const DEMO_SLUG = "nebula-labs/orbit-forge";

/**
 * The one-page shell. Owns the phase state machine:
 *   idle → scanning → complete | error
 * The scan overlay stays on the deterministic rAF timer (visual experience
 * preserved); the real API call runs in parallel and the results are applied
 * only when BOTH the timer has finished and the response has arrived.
 */
export function XRayExperience() {
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [repoInput, setRepoInput] = useState("");
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [analysis, setAnalysis] = useState<RepoAnalysis | null>(null);
  const [error, setError] = useState<AnalysisError | null>(null);

  const startRef = useRef(0);
  const rafRef = useRef<number>(0);

  /** pending response + timer-done flag meet in tryFinish() */
  const pendingRef = useRef<{ analysis?: RepoAnalysis; error?: AnalysisError } | null>(null);
  const timerDoneRef = useRef(false);
  const lastUrlRef = useRef("");

  const active = useScrollSpy(SECTION_IDS, phase === "complete");

  const tryFinish = useCallback(() => {
    if (!timerDoneRef.current || !pendingRef.current) return;
    const result = pendingRef.current;
    pendingRef.current = null;
    if (result.error) {
      setError(result.error);
      setPhase("error");
    } else if (result.analysis) {
      setAnalysis(result.analysis);
      setPhase("complete");
    }
  }, []);

  const startScan = useCallback(
    (url: string) => {
      lastUrlRef.current = url;
      const isDemo = url.includes(DEMO_SLUG);

      setRepoInput(url);
      setPhase("scanning");
      setStageIndex(0);
      setProgress(0);
      setElapsedMs(0);
      setAnalysis(null);
      setError(null);
      timerDoneRef.current = false;
      pendingRef.current = null;
      startRef.current = performance.now();

      if (isDemo) {
        // Demo mode: no network at all — resolve after the timer completes.
        setTimeout(() => {
          pendingRef.current = { analysis: structuredClone(MOCK_ANALYSIS) };
          tryFinish();
        }, TOTAL_SCAN_MS + 50);
        return;
      }

      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
        .then(async (res) => {
          const payload = (await res.json()) as { ok: boolean; analysis?: RepoAnalysis; error?: AnalysisError };
          if (payload.ok && payload.analysis) {
            pendingRef.current = { analysis: payload.analysis };
          } else {
            pendingRef.current = {
              error: payload.error ?? { code: "ANALYSIS_FAILED", message: "The analysis failed unexpectedly. Try again." },
            };
          }
        })
        .catch(() => {
          pendingRef.current = {
            error: { code: "TIMEOUT", message: "Could not reach the analysis service. Check your connection and try again." },
          };
        })
        .finally(() => tryFinish());
    },
    [tryFinish],
  );

  /**
   * One deterministic timer driver: a single rAF loop maps elapsed time to
   * (stageIndex, progress) purely from SCAN_STAGES weights. No setInterval
   * drift, no per-stage timers to tear down.
   */
  useEffect(() => {
    if (phase !== "scanning") return;

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      setElapsedMs(elapsed);

      if (elapsed >= TOTAL_SCAN_MS) {
        setProgress(100);
        setStageIndex(SCAN_STAGES.length);
        timerDoneRef.current = true;
        tryFinish();
        return;
      }

      let acc = 0;
      let idx = 0;
      for (let i = 0; i < STAGE_DURATIONS.length; i++) {
        if (elapsed < acc + STAGE_DURATIONS[i]) {
          idx = i;
          break;
        }
        acc += STAGE_DURATIONS[i];
        idx = i + 1; // on a boundary: next stage
      }
      setStageIndex(idx);
      setProgress((elapsed / TOTAL_SCAN_MS) * 100);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, tryFinish]);

  const showResults = phase === "complete" && analysis !== null;
  const currentModeIsDemo = analysis ? analysis.analysis.isDemoData : true;

  return (
    <div className="min-h-screen">
      <TopBar active={active} phase={phase.toUpperCase()} />
      <main>
        <ScanHero
          phase={phase}
          repoInput={repoInput}
          onRepoInput={setRepoInput}
          onAnalyze={startScan}
          stages={SCAN_STAGES}
          stageIndex={stageIndex}
          progress={progress}
          elapsedMs={elapsedMs}
          demoSlug={DEMO_SLUG}
          mode={currentModeIsDemo ? "demo" : "live"}
        />

        {showResults && (
          <AnalysisModeProvider isDemo={analysis.analysis.isDemoData}>
            <DemoBanner
              analysis={{
                repo: { slug: analysis.repo.slug },
                analysis: { scanId: analysis.analysis.scanId, durationMs: analysis.analysis.durationMs },
              }}
            />
            <PresentationLayer analysis={analysis} />
            <SiteFooter />
          </AnalysisModeProvider>
        )}

        {phase === "error" && error !== null && (
          <ErrorState url={lastUrlRef.current} error={error} onRetry={() => startScan(lastUrlRef.current)} />
        )}

        {phase === "idle" && (
          <section className="border-b border-line-strong px-5 py-16 md:px-10">
            <div className="flex flex-col items-start gap-3 border border-dashed border-line-strong bg-paper px-6 py-14">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink">NO ANALYSIS LOADED</p>
              <p className="max-w-md font-mono text-[11px] leading-relaxed text-muted">
                Enter a public GitHub repository URL above and press ANALYZE to run a live scan. The DEMO chip
                analyzes the fictional {DEMO_SLUG} entirely offline on simulated data.
              </p>
            </div>
          </section>
        )}
      </main>
      {/* footer rendered by page shell */}
    </div>
  );
}

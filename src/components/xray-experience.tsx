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

/**
 * Demo mode has no server round trip, so a short simulated readout is shown
 * and labelled as simulated. A LIVE scan no longer waits for any timer: the
 * report appears the moment the server answers (previously every scan was
 * held for 6.2 s regardless of real duration).
 */
const DEMO_SCAN_MS = 2400;
/** Progress animation maps elapsed → 99% over this window, then holds. */
const PROGRESS_WINDOW_MS = 5000;

const SECTION_IDS = ["sys", "analyze", "score", "structure", "map", "issues", "insights", "status", "coverage", "assistant"];

/** The fictional demo repo runs offline on the bundled mock payload. */
const DEMO_SLUG = "nebula-labs/orbit-forge";

interface ScanResult {
  analysis?: RepoAnalysis;
  error?: AnalysisError;
}

/**
 * The one-page shell. Owns the phase state machine:
 *   idle → scanning → complete | error
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
  /** increments per scan — late responses from an older scan are ignored */
  const tokenRef = useRef(0);
  const lastUrlRef = useRef("");
  const controllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  const active = useScrollSpy(SECTION_IDS, phase === "complete");

  const finish = useCallback((token: number, result: ScanResult) => {
    if (token !== tokenRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    controllerRef.current = null;
    setProgress(100);
    setStageIndex(SCAN_STAGES.length);
    setElapsedMs(performance.now() - startRef.current);
    if (result.error) {
      setError(result.error);
      setPhase("error");
      return;
    }
    if (result.analysis) {
      setAnalysis(result.analysis);
      setPhase("complete");
    }
  }, []);

  const startScan = useCallback(
    (url: string) => {
      const token = ++tokenRef.current;
      controllerRef.current?.abort();
      controllerRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lastUrlRef.current = url;
      const isDemo = url.includes(DEMO_SLUG);

      setRepoInput(url);
      setPhase("scanning");
      setStageIndex(0);
      setProgress(0);
      setElapsedMs(0);
      setAnalysis(null);
      setError(null);
      startRef.current = performance.now();

      if (isDemo) {
        // Demo mode: no network at all — the readout is explicitly simulated.
        timerRef.current = window.setTimeout(() => {
          finish(token, { analysis: structuredClone(MOCK_ANALYSIS) });
        }, DEMO_SCAN_MS);
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      timerRef.current = window.setTimeout(() => controller.abort(), 65_000);

      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      })
        .then(async (res) => {
          const payload = (await res.json()) as { ok: boolean; analysis?: RepoAnalysis; error?: AnalysisError };
          if (payload.ok && payload.analysis) {
            finish(token, { analysis: payload.analysis });
          } else {
            finish(token, {
              error: payload.error ?? { code: "ANALYSIS_FAILED", message: "The analysis failed unexpectedly. Try again." },
            });
          }
        })
        .catch((reason: unknown) => {
          if (token !== tokenRef.current) return;
          const aborted = reason instanceof DOMException && reason.name === "AbortError";
          finish(token, {
            error: aborted
              ? { code: "TIMEOUT", message: "The scan timed out on this device. The server may still be finishing; try again." }
              : { code: "TIMEOUT", message: "Could not reach the analysis service. Check your connection and try again." },
          });
        });
    },
    [finish],
  );

  const cancelScan = useCallback(() => {
    tokenRef.current++;
    controllerRef.current?.abort();
    controllerRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setProgress(0);
    setStageIndex(0);
    setError({ code: "CANCELLED", message: "The scan was cancelled. No result was applied." });
    setPhase("error");
  }, []);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  /**
   * Illustration-only progress driver. It never gates results: the scan
   * completes whenever the server responds.
   */
  useEffect(() => {
    if (phase !== "scanning") return;

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      setElapsedMs(elapsed);
      const ratio = Math.min(1, elapsed / PROGRESS_WINDOW_MS);
      const pct = Math.min(99, ratio * 100);
      setProgress(pct);
      setStageIndex(Math.min(SCAN_STAGES.length - 1, Math.floor((pct / 100) * SCAN_STAGES.length)));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

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
          onCancel={cancelScan}
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
    </div>
  );
}

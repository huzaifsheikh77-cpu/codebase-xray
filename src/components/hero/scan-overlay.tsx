"use client";

import { useEffect, useRef } from "react";
import type { ScanStage } from "@/lib/types/analysis";
import { formatElapsed } from "@/lib/utils/format";

interface ScanOverlayProps {
  /** index of the active stage, or stages.length when done */
  stageIndex: number;
  /** 0–100 */
  progress: number;
  elapsedMs: number;
  stages: ScanStage[];
  onCancel?: () => void;
}

/**
 * Full scan readout: stage list with completion ticks, progress bar with
 * sweeping highlight, elapsed clock, and a monospace log.
 *
 * The progress is a UI device, not a measurement: the real scan runs
 * server-side in a single request and cannot report per-stage progress.
 * The caption below the header states this so the readout is never
 * mistaken for telemetry.
 */
export function ScanOverlay({ stageIndex, progress, elapsedMs, stages, onCancel }: ScanOverlayProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const done = stageIndex >= stages.length;
  const current = stages[Math.min(stageIndex, stages.length - 1)];

  const logLines = stages.slice(0, stageIndex).flatMap((s) => s.log);
  const stageSpan = 100 / stages.length;
  const stageProgress = done ? 1 : Math.min(1, Math.max(0, (progress - stageSpan * stageIndex) / stageSpan));
  const activeLines = done ? [] : current.log.slice(0, Math.max(1, Math.ceil(stageProgress * current.log.length)));

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logLines.length, activeLines.length]);

  return (
    <div className="scanlines relative border border-ink bg-paper">
      <div className="flex items-center justify-between border-b border-ink px-4 py-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
          X-RAY SCAN — {done ? "COMPLETE" : current.label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          T+{formatElapsed(elapsedMs)}
        </span>
      </div>

      <p className="border-b border-line bg-bg px-4 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        ILLUSTRATIVE PROGRESS — THE ANALYSIS RUNS SERVER-SIDE AND RETURNS WHEN READY
      </p>

      {onCancel && (
        <div className="flex justify-end border-b border-line px-4 py-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-critical px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-critical hover:bg-critical hover:text-paper focus-visible:outline-acid"
          >
            CANCEL SCAN
          </button>
        </div>
      )}

      {/* progress */}
      <div className="border-b border-line px-4 py-3">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-mono text-2xl font-bold tabular-nums">
            {Math.floor(progress).toString().padStart(3, "0")}%
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            STAGE {Math.min(stageIndex + 1, stages.length)}/{stages.length}
          </span>
        </div>
        <div className="relative h-2.5 overflow-hidden border border-line-strong bg-bg">
          <div className="absolute inset-y-0 left-0 bg-acid transition-[width] duration-200 ease-linear" style={{ width: `${progress}%` }} />
          <div aria-hidden className="absolute inset-y-0 w-1/4 animate-scan-sweep bg-gradient-to-r from-transparent via-ink/10 to-transparent" />
        </div>
      </div>

      {/* stages */}
      <ol className="grid grid-cols-1 gap-px bg-line md:grid-cols-3">
        {stages.map((stage, i) => {
          const isDone = i < stageIndex;
          const isCurrent = i === stageIndex && !done;
          return (
            <li
              key={stage.id}
              className={`flex items-center gap-2 bg-paper px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] ${
                isDone ? "text-muted" : isCurrent ? "text-ink" : "text-muted/60"
              }`}
            >
              <span aria-hidden className={`inline-block size-1.5 ${isDone ? "bg-acid" : isCurrent ? "bg-violet animate-blink" : "bg-line-strong"}`} />
              <span aria-hidden className="text-violet">{String(i + 1).padStart(2, "0")}</span>
              {stage.label}
              {isDone && <span className="ml-auto text-acid">✓</span>}
            </li>
          );
        })}
      </ol>

      {/* log — completed stages then the active stage's revealed lines */}
      <div ref={logRef} className="h-40 overflow-y-auto border-t border-line bg-ink px-4 py-3 font-mono text-[11px] leading-relaxed text-acid">
        {[...logLines, ...activeLines].map((line, i) => (
          <p key={i} className="whitespace-pre-wrap">
            <span className="text-muted">›</span> {line}
          </p>
        ))}
      </div>
    </div>
  );
}

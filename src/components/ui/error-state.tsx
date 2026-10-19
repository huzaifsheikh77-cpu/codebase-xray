"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { ActionButton } from "./action-button";
import type { AnalysisError } from "@/lib/types/analysis";

interface ErrorStateProps {
  url: string;
  error: AnalysisError;
  onRetry: () => void;
}

/**
 * Scan-failure state — same visual language as the form's inline error
 * (critical border + mono uppercase) and the idle empty state's layout.
 */
export function ErrorState({ url, error, onRetry }: ErrorStateProps) {
  return (
    <section className="border-b border-line-strong px-5 py-16 md:px-10">
      <div className="flex max-w-2xl flex-col items-start gap-4 border border-critical bg-paper px-6 py-10">
        <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-critical">
          <CircleAlert className="size-4" aria-hidden />
          ✕ SCAN FAILED — {error.code.replace(/_/g, " ")}
        </p>
        <p className="font-mono text-[11px] leading-relaxed text-muted">
          <span className="text-ink">target</span> <span className="text-violet">::</span> {url || "—"}
        </p>
        <p className="max-w-md text-sm leading-relaxed text-ink">{error.message}</p>
        <ActionButton type="button" onClick={onRetry} className="mt-2">
          <RotateCcw className="size-4" aria-hidden />
          RETRY SCAN
        </ActionButton>
      </div>
    </section>
  );
}

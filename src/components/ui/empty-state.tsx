import { FileQuestion, TriangleAlert } from "lucide-react";

interface EmptyStateProps {
  title: string;
  hint?: string;
}

/** Designed empty state — dashed technical frame, mono copy. */
export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-line-strong bg-bg px-6 py-14 text-center">
      <FileQuestion className="size-6 text-muted" aria-hidden />
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink">{title}</p>
      {hint && <p className="max-w-sm font-mono text-[11px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  detail?: string;
  onRetry?: () => void;
}

/** Designed error state — violet-accent technical frame with optional retry. */
export function ErrorState({ title, detail, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-critical bg-paper px-6 py-14 text-center">
      <TriangleAlert className="size-6 text-critical" aria-hidden />
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink">{title}</p>
      {detail && <p className="max-w-md font-mono text-[11px] leading-relaxed text-muted">{detail}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 border border-ink bg-paper px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] hover:bg-acid focus-visible:outline-acid active:translate-y-px"
        >
          RETRY SCAN
        </button>
      )}
    </div>
 );
}

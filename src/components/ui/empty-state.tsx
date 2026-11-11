import { FileQuestion } from "lucide-react";

interface EmptyStateProps {
  title: string;
  hint?: string;
}

/**
 * Designed empty state — dashed technical frame, mono copy.
 * Used whenever a section legitimately has nothing to show (zero findings,
 * an empty filter result, missing measurements). An empty section must say
 * so rather than render a blank panel.
 */
export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-line-strong bg-bg px-6 py-14 text-center">
      <FileQuestion className="size-6 text-muted" aria-hidden />
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink">{title}</p>
      {hint && <p className="max-w-md font-mono text-[11px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

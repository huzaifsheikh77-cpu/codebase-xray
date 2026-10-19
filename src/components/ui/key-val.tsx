interface KeyValProps {
  k: string;
  v: React.ReactNode;
  /** emphasize the value (larger mono) */
  strong?: boolean;
}

/** Technical ledger row: KEY ·········· value */
export function KeyVal({ k, v, strong }: KeyValProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{k}</span>
      <span aria-hidden className="mx-1 h-px min-w-4 flex-1 border-b border-dotted border-line-strong" />
      <span className={`font-mono ${strong ? "text-sm font-bold" : "text-xs"} text-ink`}>{v}</span>
    </div>
  );
}

import type { ReactNode } from "react";

interface PanelProps {
  /** mono label rendered in the panel header strip */
  label?: string;
  /** right-aligned slot in the header strip (mono text or icon) */
  meta?: ReactNode;
  /** render corner tick squares (default true) */
  ticks?: boolean;
  className?: string;
  children: ReactNode;
}

/** Sharp technical panel: 1px border, 3px radius, HUD ticks, header strip. */
export function Panel({ label, meta, ticks = true, className, children }: PanelProps) {
  return (
    <div className={`relative min-w-0 border border-line bg-paper ${className ?? ""}`}>
      {ticks && (
        <>
          <span aria-hidden className="absolute -top-px -left-px size-1.5 bg-ink" />
          <span aria-hidden className="absolute -top-px -right-px size-1.5 bg-ink" />
          <span aria-hidden className="absolute -bottom-px -left-px size-1.5 bg-ink" />
          <span aria-hidden className="absolute -bottom-px -right-px size-1.5 bg-ink" />
        </>
      )}
      {label && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink">
            {label}
          </span>
          {meta && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {meta}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

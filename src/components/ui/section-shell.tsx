import type { ReactNode } from "react";

interface SectionShellProps {
  /** anchor id used by the top navigation */
  id: string;
  /** section number without slash, e.g. "02" */
  number: string;
  title: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Numbered editorial section: /02 ── TITLE ──────────── [meta] */
export function SectionShell({ id, number, title, meta, className, children }: SectionShellProps) {
  return (
    <section
      id={id}
      data-section={id}
      className={`scroll-mt-20 border-b border-line-strong px-5 py-12 md:px-10 md:py-16 ${className ?? ""}`}
    >
      <header className="mb-8 md:mb-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line-strong pb-5">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
              <span className="inline-block size-2 bg-violet" aria-hidden />
              /{number}
            </p>
            <h2 className="text-3xl font-bold uppercase leading-none tracking-tight md:text-5xl">
              {title}
            </h2>
          </div>
          {meta && (
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              {meta}
            </div>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

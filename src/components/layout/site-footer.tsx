"use client";

import { ScanLine } from "lucide-react";
import { useAnalysisMode } from "@/components/ui/demo-badge";

/** Metadata ticker — mode-aware so it never lies about the data source. */
function tickerItems(isDemo: boolean): string[] {
  return [
    "NODE: CXR-01",
    "SCAN: 0007",
    "CONNECTION: SECURE",
    "ENGINE: XRAY.ENGINE V2.7.3",
    ...(isDemo
      ? ["DEMO DATA — FICTIONAL REPOSITORY", "NO LIVE REPOSITORY WAS CONTACTED"]
      : ["LIVE ANALYSIS — GITHUB REST", "NO REPOSITORY CODE WAS EXECUTED"]),
  ];
}

export function SiteFooter() {
  const isDemo = useAnalysisMode();
  const items = tickerItems(isDemo);

  return (
    <footer className="border-t border-line-strong bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-6 px-5 py-10 md:px-10">
        <div className="flex items-center gap-3">
          <ScanLine className="size-5" aria-hidden />
          <div>
            <p className="font-mono text-sm font-bold tracking-[0.08em]">CODEBASE X-RAY_</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              ENGINEERING HEALTH ANALYSIS
            </p>
          </div>
        </div>

        <nav aria-label="Footer" className="flex gap-6 font-mono text-[11px] uppercase tracking-[0.16em]">
          <a href="#" className="text-muted transition-colors hover:text-ink focus-visible:outline-acid">GitHub</a>
          <a href="#" className="text-muted transition-colors hover:text-ink focus-visible:outline-acid">Documentation</a>
          <a href="#" className="text-muted transition-colors hover:text-ink focus-visible:outline-acid">About</a>
        </nav>

        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
          © 2026 CODEBASE X-RAY · DEMO BUILD
        </p>
      </div>

      {/* metadata ticker */}
      <div className="overflow-hidden border-t border-line bg-ink py-1.5" aria-hidden>
        <div className="flex gap-8 whitespace-nowrap px-5 font-mono text-[9px] uppercase tracking-[0.2em] text-acid/80 md:px-10">
          {items.map((item) => (
            <span key={item} className="flex items-center gap-8">
              {item}
              <span className="text-acid/40">◆</span>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}

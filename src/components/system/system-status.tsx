"use client";

import { Panel } from "@/components/ui/panel";
import { SectionShell } from "@/components/ui/section-shell";
import { StatusDot } from "@/components/ui/status-dot";
import { formatClock, formatCompact } from "@/lib/utils/format";
import type { RepoAnalysis } from "@/lib/types/analysis";

export function SystemStatus({ analysis }: { analysis: RepoAnalysis }) {
  const stats = analysis.structure.stats;
  const durationSec = (analysis.analysis.durationMs / 1000).toFixed(0);

  return (
    <SectionShell
      id="status"
      number="07"
      title="System Status"
      meta={<span>{analysis.analysis.engineVersion} · LAST CHECK {formatClock(analysis.system[0].lastChecked)}</span>}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel label="SERVICE GRID" meta="4 SERVICES">
          <ul className="divide-y divide-line">
            {analysis.system.map((svc) => (
              <li key={svc.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3.5">
                <div className="flex min-w-40 items-center gap-2.5">
                  <StatusDot status={svc.status} />
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.16em]">{svc.label}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  <span className="text-ink">{svc.status.toUpperCase()}</span>
                  <span>LATENCY {svc.latencyMs}MS</span>
                  <span>{svc.version}</span>
                  <span>CHK {formatClock(svc.lastChecked)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel label="TERMINAL READOUT">
          <div className="h-full bg-ink px-4 py-4 font-mono text-[11px] leading-7 text-acid">
            <p>&gt; SCAN_COMPLETE</p>
            <p>&gt; {formatCompact(stats.analyzedFiles ?? stats.totalFiles)} FILES INSPECTED</p>
            <p>&gt; ≈ {formatCompact(stats.linesOfCode)} LINES OF CODE (EST.)</p>
            <p>&gt; {durationSec} SECONDS ELAPSED</p>
            <p>&gt; REPORT_READY<span className="animate-blink">▮</span></p>
          </div>
        </Panel>
      </div>
    </SectionShell>
  );
}

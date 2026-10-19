"use client";

import { useState } from "react";
import { Crosshair, FileWarning } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { SectionShell } from "@/components/ui/section-shell";
import { SeverityChip } from "@/components/ui/severity-chip";
import { DemoBadge } from "@/components/ui/demo-badge";
import { SEVERITY_ORDER, formatCompact } from "@/lib/utils/format";
import type { Issue } from "@/lib/types/analysis";

export function IssuesSection({ issues }: { issues: Issue[] }) {
  const sorted = [...issues].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id ?? "");
  const selected = sorted.find((i) => i.id === selectedId) ?? sorted[0];

  return (
    <SectionShell
      id="issues"
      number="05"
      title="Top Issues"
      meta={
        <span className="flex items-center gap-2">
          <DemoBadge />
          <span>{sorted.filter((i) => i.severity === "critical" || i.severity === "high").length} CRITICAL/HIGH OF {sorted.length}</span>
        </span>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* list */}
        <Panel label="FINDINGS REGISTER" meta="SELECT TO INSPECT">
          <ol className="divide-y divide-line">
            {sorted.map((issue, i) => (
              <li key={issue.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(issue.id)}
                  aria-pressed={selected.id === issue.id}
                  className={`w-full border-l-2 px-4 py-3 text-left transition-colors focus-visible:outline-acid ${
                    selected.id === issue.id ? "border-l-violet bg-acid/10" : "border-l-transparent hover:bg-bg"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs font-bold uppercase tracking-[0.08em]">
                      {issue.title}
                    </span>
                    <SeverityChip severity={issue.severity} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 pl-7 font-mono text-[10px] text-muted">
                    <FileWarning className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{issue.file ?? "REPOSITORY-WIDE"}</span>
                    {issue.fileLineCount !== undefined && (
                      <span className="ml-auto shrink-0 tabular-nums">{formatCompact(issue.fileLineCount)} LINES</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </Panel>

        {/* detail */}
        <Panel label="FINDING DETAIL" meta={selected.id}>
          <div className="px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-mono text-lg font-bold uppercase tracking-[0.04em]">{selected.title}</h3>
              <SeverityChip severity={selected.severity} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-y border-line py-3 font-mono text-[10px] uppercase tracking-[0.14em]">
              <div>
                <dt className="text-muted">FILE</dt>
                <dd className="mt-0.5 break-all text-ink">{selected.file ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">LINE</dt>
                <dd className="mt-0.5 text-ink">{selected.line !== undefined ? selected.line : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">FILE SIZE</dt>
                <dd className="mt-0.5 text-ink">{selected.fileLineCount !== undefined ? `${formatCompact(selected.fileLineCount)} LINES` : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">SEVERITY</dt>
                <dd className="mt-0.5 text-ink">{selected.severity.toUpperCase()}</dd>
              </div>
            </dl>

            <p className="mt-4 text-sm leading-relaxed text-ink">{selected.detail}</p>

            <div className="mt-5">
              <p className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-violet">
                <Crosshair className="size-3.5" aria-hidden /> EVIDENCE
              </p>
              <ul className="space-y-1.5">
                {selected.evidence?.map((ev, i) => (
                  <li key={i} className="flex gap-2 font-mono text-[11px] leading-relaxed text-ink">
                    <span aria-hidden className="text-violet">▪</span>
                    {ev}
                  </li>
                ))}
              </ul>
            </div>

            {selected.recommendation && (
              <div className="mt-5 border-l-2 border-acid bg-acid/10 px-4 py-3">
                <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">RECOMMENDATION</p>
                <p className="text-sm leading-relaxed">{selected.recommendation}</p>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </SectionShell>
  );
}

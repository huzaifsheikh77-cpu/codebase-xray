"use client";

import { useMemo, useState } from "react";
import { Crosshair, FileWarning } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { SectionShell } from "@/components/ui/section-shell";
import { SeverityChip } from "@/components/ui/severity-chip";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SEVERITY_ORDER, formatCompact } from "@/lib/utils/format";
import type { Issue, IssueCategory, Severity } from "@/lib/types/analysis";

const SEVERITY_FILTERS: ("all" | Severity)[] = ["all", "critical", "high", "medium", "low"];
const CATEGORY_FILTERS: ("all" | IssueCategory)[] = [
  "all",
  "security",
  "quality",
  "architecture",
  "testing",
  "documentation",
  "dependencies",
  "maintainability",
];

function ConfidenceChip({ confidence }: { confidence?: Issue["confidence"] }) {
  if (!confidence) return null;
  const label = confidence.toUpperCase();
  const tone =
    confidence === "verified"
      ? "border-acid text-ink"
      : confidence === "high"
        ? "border-line-strong text-ink"
        : confidence === "heuristic"
          ? "border-line-strong text-muted"
          : "border-violet text-violet";
  return <span className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] ${tone}`}>{label}</span>;
}

export function IssuesSection({ issues }: { issues: Issue[] }) {
  const sorted = useMemo(
    () => [...issues].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]),
    [issues],
  );
  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id ?? "");
  const [severity, setSeverity] = useState<"all" | Severity>("all");
  const [category, setCategory] = useState<"all" | IssueCategory>("all");

  const filtered = useMemo(
    () =>
      sorted.filter(
        (issue) =>
          (severity === "all" || issue.severity === severity) &&
          (category === "all" || issue.category === category),
      ),
    [sorted, severity, category],
  );

  // The detail pane must never dereference an empty list. Previously
  // `selected` was undefined when a scan produced zero issues and the whole
  // report crashed on `selected.id`.
  const selected = filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null;
  const criticalHigh = sorted.filter((i) => i.severity === "critical" || i.severity === "high").length;

  const meta = (
    <span className="flex items-center gap-2">
      <DemoBadge />
      <span>
        {criticalHigh} CRITICAL/HIGH OF {sorted.length}
      </span>
    </span>
  );

  if (sorted.length === 0) {
    return (
      <SectionShell id="issues" number="05" title="Top Issues" meta={meta}>
        <EmptyState
          title="NO FINDINGS IN THE INSPECTED SAMPLE"
          hint="The detectors produced no findings for the files that were inspected. This is not proof that the repository is problem-free: findings only cover inspected content, and a partial scan may have missed the relevant modules."
        />
      </SectionShell>
    );
  }

  return (
    <SectionShell id="issues" number="05" title="Top Issues" meta={meta}>
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">SEVERITY</span>
          {SEVERITY_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSeverity(option)}
              aria-pressed={severity === option}
              className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-acid ${
                severity === option ? "border-ink bg-acid text-ink" : "border-line-strong bg-paper text-muted hover:border-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">CATEGORY</span>
          {CATEGORY_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              aria-pressed={category === option}
              className={`border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-acid ${
                category === option ? "border-ink bg-acid text-ink" : "border-line-strong bg-paper text-muted hover:border-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* list */}
        <Panel label="FINDINGS REGISTER" meta={`${filtered.length} SHOWN · SELECT TO INSPECT`}>
          {filtered.length === 0 ? (
            <EmptyState title="NO FINDINGS MATCH THESE FILTERS" hint="Clear a filter to see the other findings." />
          ) : (
            <ol className="divide-y divide-line">
              {filtered.map((issue, i) => (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(issue.id)}
                    aria-pressed={selected?.id === issue.id}
                    className={`w-full border-l-2 px-4 py-3 text-left transition-colors focus-visible:outline-acid ${
                      selected?.id === issue.id ? "border-l-violet bg-acid/10" : "border-l-transparent hover:bg-bg"
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
          )}
        </Panel>

        {/* detail */}
        {selected && (
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
                  <dt className="text-muted">CATEGORY</dt>
                  <dd className="mt-0.5 text-ink">{selected.category?.toUpperCase() ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">SEVERITY</dt>
                  <dd className="mt-0.5 text-ink">{selected.severity.toUpperCase()}</dd>
                </div>
                <div>
                  <dt className="text-muted">CONFIDENCE</dt>
                  <dd className="mt-0.5">
                    <ConfidenceChip confidence={selected.confidence} />
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">FILE SIZE</dt>
                  <dd className="mt-0.5 text-ink">
                    {selected.fileLineCount !== undefined ? `${formatCompact(selected.fileLineCount)} LINES` : "—"}
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-sm leading-relaxed text-ink">{selected.detail}</p>

              {selected.detectionMethod && (
                <p className="mt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-muted">
                  METHOD :: {selected.detectionMethod}
                </p>
              )}

              <div className="mt-5">
                <p className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-violet">
                  <Crosshair className="size-3.5" aria-hidden /> EVIDENCE
                </p>
                <ul className="space-y-1.5">
                  {(selected.evidence ?? []).map((ev, i) => (
                    <li key={i} className="flex gap-2 font-mono text-[11px] leading-relaxed text-ink">
                      <span aria-hidden className="text-violet">
                        ▪
                      </span>
                      {ev}
                    </li>
                  ))}
                </ul>
              </div>

              {selected.limitation && (
                <div className="mt-4 border border-dashed border-line-strong px-3 py-2">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-muted">LIMITATION</p>
                  <p className="mt-1 font-mono text-[10px] leading-relaxed text-muted">{selected.limitation}</p>
                </div>
              )}

              {selected.recommendation && (
                <div className="mt-5 border-l-2 border-acid bg-acid/10 px-4 py-3">
                  <p className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">RECOMMENDATION</p>
                  <p className="text-sm leading-relaxed">{selected.recommendation}</p>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>
    </SectionShell>
  );
}

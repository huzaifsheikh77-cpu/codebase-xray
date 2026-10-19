"use client";

import { AnalysisSummary } from "@/components/analysis/analysis-summary";
import { RepoStructure } from "@/components/structure/repo-structure";
import { CodebaseMap } from "@/components/visualization/codebase-map";
import { IssuesSection } from "@/components/issues/issues-section";
import { InsightsSection } from "@/components/insights/insights-section";
import { SystemStatus } from "@/components/system/system-status";
import { MonoLabel } from "@/components/ui/mono-label";
import { PartialBanner } from "@/components/ui/demo-badge";
import { formatCompact, formatClock } from "@/lib/utils/format";
import type { RepoAnalysis } from "@/lib/types/analysis";

/** Sections /00–/07 rendered purely from the typed analysis object. */
export function PresentationLayer({ analysis }: { analysis: RepoAnalysis }) {
  return (
    <>
      {/* consecutive degraded-scan notice — only on partial scans */}
      {analysis.analysis.partial && <PartialBanner analysis={analysis} />}

      {/* /00 SYS strip — scan metadata ledger */}
      <section id="sys" data-section="sys" className="border-b border-line-strong px-5 py-8 md:px-10">
        <div className="mb-4 flex items-center justify-between">
          <MonoLabel tick>/00 SYSTEM — SCAN MANIFEST</MonoLabel>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            GENERATED {formatClock(analysis.analysis.generatedAt)} · {analysis.analysis.durationMs}MS
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-5">
          {[
            ["REPOSITORY", analysis.repo.slug],
            ["SCAN ID", analysis.analysis.scanId],
            ["FILES IN TREE", formatCompact(analysis.structure.stats.totalFiles)],
            ["FILES INSPECTED", formatCompact(analysis.structure.stats.analyzedFiles ?? analysis.structure.stats.totalFiles)],
            ["LINES (EST.)", formatCompact(analysis.structure.stats.linesOfCode)],
          ].map(([k, v]) => (
            <div key={k} className="bg-paper px-3 py-2.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">{k}</p>
              <p className="mt-0.5 truncate font-mono text-xs font-bold">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <AnalysisSummary analysis={analysis} />
      <RepoStructure analysis={analysis} />
      <CodebaseMap analysis={analysis} />
      <IssuesSection issues={analysis.issues} />
      <InsightsSection insights={analysis.insights} />
      <SystemStatus analysis={analysis} />
    </>
  );
}

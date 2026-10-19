"use client";

import { Panel } from "@/components/ui/panel";
import { SectionShell } from "@/components/ui/section-shell";
import { DemoBadge } from "@/components/ui/demo-badge";
import { KeyVal } from "@/components/ui/key-val";
import { FileTree } from "./file-tree";
import { LanguageChart } from "./language-chart";
import { formatCompact, formatKb } from "@/lib/utils/format";
import type { RepoAnalysis } from "@/lib/types/analysis";

export function RepoStructure({ analysis }: { analysis: RepoAnalysis }) {
  const { stats, languages } = analysis.structure;

  return (
    <SectionShell
      id="structure"
      number="03"
      title="Repository Structure"
      meta={
        <span className="flex items-center gap-2">
          <DemoBadge />
          <span>BRANCH {analysis.repo.defaultBranch.toUpperCase()}</span>
        </span>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Panel label="FILE TREE" meta={`${formatCompact(stats.totalFiles)} FILES · PARTIAL VIEW`}>
          <div className="max-h-[420px] overflow-y-auto px-3 py-2">
            <FileTree
              tree={analysis.structure.fileTree}
              defaultExpanded={["apps", "apps/web", "packages", "packages/core"]}
            />
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel label="LANGUAGE DISTRIBUTION" meta="BY SHARE %">
            <div className="px-4 py-3">
              <LanguageChart data={languages} />
              <ul className="mt-2 grid grid-cols-2 gap-x-4 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {languages.map((lang) => (
                  <li key={lang.name} className="flex items-center justify-between border-t border-line py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span aria-hidden className="inline-block size-1.5" style={{ backgroundColor: lang.color }} />
                      {lang.name}
                    </span>
                    <span className="text-ink">{lang.pct.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel label="REPOSITORY STATISTICS" meta="LEDGER">
            <div className="px-4 py-2">
              <KeyVal k="TOTAL FILES" v={formatCompact(stats.totalFiles)} strong />
              <KeyVal k="FILES INSPECTED" v={formatCompact(stats.analyzedFiles ?? stats.totalFiles)} />
              <KeyVal k="LINES OF CODE" v={`≈ ${formatCompact(stats.linesOfCode)}`} strong />
              <KeyVal k="LANGUAGES" v={stats.languages} />
              <KeyVal k="DEPENDENCIES" v={stats.dependencies} />
              <KeyVal k="REPOSITORY SIZE" v={formatKb(stats.repoSizeKb)} />
              <KeyVal k="TEST FILES" v={stats.testFiles} />
            </div>
            <p className="border-t border-line px-4 py-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted">
              ≈ LOC ESTIMATED FROM TREE BLOB SIZES · {formatCompact(stats.exactLocFiles ?? 0)} FILES COUNTED EXACTLY
            </p>
          </Panel>
        </div>
      </div>
    </SectionShell>
  );
}

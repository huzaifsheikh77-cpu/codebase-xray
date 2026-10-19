"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { SectionShell } from "@/components/ui/section-shell";
import { Meter } from "@/components/ui/meter";
import { DemoBadge } from "@/components/ui/demo-badge";
import { BAND_COLOR, BAND_LABEL, formatCompact } from "@/lib/utils/format";
import type { RepoAnalysis } from "@/lib/types/analysis";

const SECTOR_ICON: Record<string, string> = {
  code_quality: "◆",
  security: "⬢",
  testing: "◈",
  architecture: "▣",
  documentation: "▤",
  maintainability: "◉",
};

export function AnalysisSummary({ analysis }: { analysis: RepoAnalysis }) {
  const { overall } = analysis.score;
  return (
    <SectionShell
      id="score"
      number="02"
      title="Analysis Summary"
      meta={
        <span className="flex items-center gap-2">
          <DemoBadge />
          <span>SCAN {analysis.analysis.scanId}</span>
        </span>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Panel label="OVERALL ENGINEERING SCORE" meta="0–100">
          <div className="px-5 py-6">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-7xl font-bold leading-none tracking-tight">
                {overall.value}
              </span>
              <span className="font-mono text-sm text-muted">/ 100</span>
            </div>
            <div className="mt-4">
              <Meter value={overall.value} duration={1100} />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 font-mono text-[10px] uppercase tracking-[0.14em]">
              <div>
                <dt className="text-muted">BAND</dt>
                <dd className="mt-1 font-bold" style={{ color: BAND_COLOR[overall.band] }}>
                  {BAND_LABEL[overall.band]}
                </dd>
              </div>
              <div>
                <dt className="text-muted">SECTORS</dt>
                <dd className="mt-1 font-bold">6</dd>
              </div>
              <div>
                <dt className="text-muted">DURATION</dt>
                <dd className="mt-1 font-bold">{(analysis.analysis.durationMs / 1000).toFixed(1)}S</dd>
              </div>
              <div>
                <dt className="text-muted">FILES INSPECTED</dt>
                <dd className="mt-1 font-bold">{formatCompact(analysis.structure.stats.analyzedFiles ?? analysis.structure.stats.totalFiles)}</dd>
              </div>
            </dl>
            {/* A score computed from a bounded sample is not a whole-repo audit. */}
            {(analysis.structure.stats.analyzedFiles ?? 0) > 0 &&
              (analysis.structure.stats.analyzedFiles ?? 0) < analysis.structure.stats.totalFiles && (
                <p className="mt-4 border-t border-line pt-3 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted">
                  SCORE DERIVED FROM {formatCompact(analysis.structure.stats.analyzedFiles ?? 0)} OF{" "}
                  {formatCompact(analysis.structure.stats.totalFiles)} FILES — A BOUNDED SAMPLE, NOT A FULL AUDIT
                </p>
              )}
          </div>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {analysis.score.sectors.map((sector, i) => (
            <SectorCard key={sector.id} sector={sector} index={i} />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function SectorCard({ sector, index }: { sector: RepoAnalysis["score"]["sectors"][number]; index: number }) {
  const color = BAND_COLOR[sector.score.band];
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 150 + index * 90);
    return () => clearTimeout(t);
  }, [index]);
  const meterValue = armed ? sector.score.value : 0;

  return (
    <Panel label={sector.label} meta={SECTOR_ICON[sector.id]}>
      <div className="px-4 py-4">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-3xl font-bold tabular-nums">{sector.score.value}</span>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color }}>
            {BAND_LABEL[sector.score.band]}
          </span>
        </div>
        <div className="mt-3">
          <Meter value={meterValue} color={color} duration={800} delay={0} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">{sector.explanation}</p>
      </div>
    </Panel>
  );
}

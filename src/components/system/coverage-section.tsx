"use client";

import { Panel } from "@/components/ui/panel";
import { SectionShell } from "@/components/ui/section-shell";
import { DemoBadge } from "@/components/ui/demo-badge";
import { formatCompact } from "@/lib/utils/format";
import type { RepoAnalysis } from "@/lib/types/analysis";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">{label}</span>
      <span className="text-right font-mono text-[10px] tabular-nums text-ink">{value}</span>
    </div>
  );
}

/**
 * /08 — ANALYSIS COVERAGE & LIMITATIONS.
 *
 * This section exists so a partial scan can never be mistaken for a complete
 * one. Every number is reported by the engine; anything missing is shown as
 * NOT REPORTED rather than filled in.
 */
export function CoverageSection({ analysis }: { analysis: RepoAnalysis }) {
  const coverage = analysis.analysis.coverage;
  const budget = analysis.analysis.budget;
  const profile = analysis.structure.architectureProfile;
  const astLanguages = coverage?.astLanguages ?? [];

  return (
    <SectionShell
      id="coverage"
      number="08"
      title="Coverage & Limitations"
      meta={
        <span className="flex items-center gap-2">
          <DemoBadge />
          <span>{coverage ? `${coverage.inspectedPct}% OF ELIGIBLE FILES` : "NOT REPORTED"}</span>
        </span>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel label="INSPECTION COVERAGE" meta={coverage?.truncated ? "TREE TRUNCATED" : "TREE COMPLETE"}>
          <div className="px-4 py-3">
            {coverage ? (
              <>
                <div className="mb-3">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="font-mono text-2xl font-bold tabular-nums">{coverage.inspectedPct}%</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                      {formatCompact(coverage.inspectedFiles)} / {formatCompact(coverage.eligibleFiles)} FILES
                    </span>
                  </div>
                  <div className="h-2 border border-line-strong bg-bg">
                    <div className="h-full bg-acid" style={{ width: `${Math.min(100, coverage.inspectedPct)}%` }} />
                  </div>
                </div>
                <Row label="ELIGIBLE BYTES" value={`${(coverage.eligibleBytes / 1024 / 1024).toFixed(1)} MB`} />
                <Row label="INSPECTED BYTES" value={`${(coverage.inspectedBytes / 1024 / 1024).toFixed(1)} MB`} />
                <Row label="PARSED FILES" value={formatCompact(coverage.parsedFiles)} />
                <Row label="PARSE FAILURES" value={formatCompact(coverage.parseFailures)} />
                <Row label="UNRESOLVED IMPORTS" value={formatCompact(coverage.unresolvedImports)} />
                <Row label="SKIPPED BY BUDGET" value={formatCompact(coverage.skippedForBudget ?? 0)} />
                <Row label="UNSUPPORTED SOURCE" value={formatCompact(coverage.unsupportedSourceFiles ?? 0)} />
              </>
            ) : (
              <p className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-muted">
                THIS PAYLOAD DOES NOT REPORT COVERAGE. NO COVERAGE CLAIM IS MADE.
              </p>
            )}
          </div>
        </Panel>

        <Panel label="INSPECTION BUDGET" meta={budget?.tier ? `${budget.tier.toUpperCase()} TIER` : "DEFAULT"}>
          <div className="px-4 py-3">
            {budget ? (
              <>
                <Row label="MAX FILES" value={formatCompact(budget.maxFiles)} />
                <Row label="MAX CONTENT" value={`${(budget.maxTotalBytes / 1024 / 1024).toFixed(0)} MB`} />
                <Row label="MAX FILE" value={`${Math.round(budget.maxFileBytes / 1024)} KB`} />
                <Row label="CONCURRENCY" value={String(budget.concurrency)} />
                <Row label="DEADLINE" value={`${Math.round(budget.deadlineMs / 1000)} S`} />
              </>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">BUDGET NOT REPORTED</p>
            )}
            <p className="mt-3 border-t border-dashed border-line-strong pt-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted">
              BUDGETS ARE HARD CAPS. EXCEEDING ONE DEGRADES THE SCAN TO PARTIAL — IT NEVER FABRICATES DATA.
            </p>
          </div>
        </Panel>

        <Panel label="PARSERS & STRUCTURE" meta={profile ? profile.confidence.toUpperCase() : "UNKNOWN"}>
          <div className="px-4 py-3">
            <Row label="ARCHITECTURE" value={(profile?.pattern ?? "UNDETERMINED").toUpperCase()} />
            {profile?.evidence.map((e) => (
              <p key={e} className="mt-1 font-mono text-[9px] leading-relaxed text-muted">
                ▪ {e}
              </p>
            ))}
            <Row label="AST LANGUAGES" value={astLanguages.length > 0 ? astLanguages.join(", ").toUpperCase() : "NONE"} />
            <Row label="FUNCTIONS MEASURED" value={formatCompact(analysis.structure.stats.measuredFunctions ?? 0)} />
            {coverage?.capabilities && (
              <>
                <Row
                  label="PARSED: FULL / PARTIAL"
                  value={`${coverage.capabilities.full} / ${coverage.capabilities.partial}`}
                />
                <Row
                  label="IMPORT-ONLY / NONE"
                  value={`${coverage.capabilities.importOnly} / ${coverage.capabilities.unsupported}`}
                />
              </>
            )}
            <p className="mt-2 border-t border-dashed border-line-strong pt-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted">
              {profile?.limitations ??
                "STRUCTURE WAS INFERRED FROM WHICH FILES WERE INSPECTED; IT IS NOT A RUNTIME CALL GRAPH."}
            </p>
          </div>
        </Panel>
      </div>

      {coverage?.critical && coverage.critical.length > 0 && (
        <Panel label="CRITICAL PATH COVERAGE" meta="PATH-BASED CLASSIFICATION">
          <div className="px-4 py-3">
            {coverage.critical.map((entry) => {
              const complete = entry.inspected === entry.discovered;
              return (
                <div key={entry.category} className="flex items-baseline justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
                    {entry.category.replace(/-/g, " ").toUpperCase()}
                  </span>
                  <span
                    className={`font-mono text-[10px] tabular-nums ${complete ? "text-ink" : "text-critical"}`}
                  >
                    {entry.inspected} / {entry.discovered} FILES
                  </span>
                </div>
              );
            })}
            <p className="mt-2 border-t border-dashed border-line-strong pt-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted">
              CLASSIFIED BY PATH, NOT CONTENT. A MISSING CATEGORY DOES NOT PROVE THE CODE IS ABSENT — ONLY THAT NO PATH
              MATCHED.
            </p>
          </div>
        </Panel>
      )}

      <Panel label="DECLARED LIMITATIONS" meta={`${(analysis.analysis.warnings ?? []).length} WARNING(S)`}>
        <ul className="divide-y divide-line px-4">
          {(analysis.analysis.warnings ?? []).map((warning) => (
            <li key={warning} className="flex gap-2 py-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-muted">
              <span aria-hidden className="text-violet">
                &gt;
              </span>
              {warning}
            </li>
          ))}
          <li className="flex gap-2 py-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-muted">
            <span aria-hidden className="text-violet">
              &gt;
            </span>
            SCORES ARE HEURISTIC AND COMPARABLE ONLY WITHIN {analysis.analysis.scoringVersion ?? "THE SAME SCORING VERSION"}.
          </li>
          <li className="flex gap-2 py-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-muted">
            <span aria-hidden className="text-violet">
              &gt;
            </span>
            NO REPOSITORY CODE IS EXECUTED, NO TESTS ARE RUN, AND NO COVERAGE PERCENTAGE IS INFERRED.
          </li>
        </ul>
      </Panel>
    </SectionShell>
  );
}

"use client";

import { useState } from "react";
import { SectionShell } from "@/components/ui/section-shell";
import { TabBar } from "@/components/ui/tab-bar";
import { DemoBadge } from "@/components/ui/demo-badge";
import { IsoMap } from "./iso-map";
import { DepGraph } from "./dep-graph";
import type { RepoAnalysis } from "@/lib/types/analysis";

const TABS = [
  { id: "iso", label: "ISO MAP" },
  { id: "graph", label: "DEPENDENCY GRAPH" },
];

/**
 * /04. The isometric map is an art-directed illustration of the FICTIONAL demo
 * repository — its blocks are hardcoded, so it is never shown for a live scan.
 * Live results render the real graph only.
 */
export function CodebaseMap({ analysis }: { analysis: RepoAnalysis }) {
  const [tab, setTab] = useState("iso");
  const isDemo = analysis.analysis.isDemoData;

  return (
    <SectionShell
      id="map"
      number="04"
      title="Codebase Visualization"
      meta={
        <span className="flex items-center gap-2">
          <DemoBadge />
          <span>{analysis.graph.nodes.length} MODULES</span>
        </span>
      }
    >
      {isDemo ? (
        <>
          <TabBar name="Visualization mode" tabs={TABS} active={tab} onChange={setTab} />
          <div className="mt-6" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "iso" ? <IsoMap /> : <DepGraph graph={analysis.graph} />}
          </div>
        </>
      ) : (
        <div className="mt-6">
          <DepGraph graph={analysis.graph} />
        </div>
      )}
    </SectionShell>
  );
}

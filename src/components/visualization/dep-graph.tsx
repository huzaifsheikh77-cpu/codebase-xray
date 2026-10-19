"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { DemoBadge } from "@/components/ui/demo-badge";
import type { RepoAnalysis } from "@/lib/types/analysis";

/**
 * 2D architecture / dependency graph — custom SVG (not Recharts).
 * The hand-tuned layout below matches the bundled demo graph; live graphs
 * have arbitrary node ids (real workspace/module names), so they use a
 * deterministic grid instead. Nothing is invented to fill the canvas: a
 * node without an import edge simply has no edge.
 */

const NODE_POS: Record<string, { x: number; y: number }> = {
  web: { x: 96, y: 128 },
  api: { x: 150, y: 208 },
  ui: { x: 470, y: 96 },
  core: { x: 430, y: 168 },
  cli: { x: 560, y: 200 },
  lib: { x: 140, y: 330 },
  scripts: { x: 240, y: 368 },
  zod: { x: 420, y: 352 },
  fastify: { x: 500, y: 316 },
  react: { x: 568, y: 272 },
  drizzle: { x: 540, y: 376 },
};

const CLUSTER_ZONE: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
  apps: { x: 40, y: 84, w: 230, h: 170, label: "APPS" },
  packages: { x: 370, y: 52, w: 250, h: 200, label: "PACKAGES" },
  shared: { x: 80, y: 288, w: 230, h: 116, label: "SHARED" },
  external: { x: 370, y: 288, w: 250, h: 124, label: "EXTERNAL" },
};

const NODE_W = 76;
const NODE_H = 24;

/** Deterministic grid for live graphs — cluster-major, then id, so it is stable. */
function gridLayout(nodes: RepoAnalysis["graph"]["nodes"]): Record<string, { x: number; y: number }> {
  const ids = [...nodes]
    .sort((a, b) => a.cluster.localeCompare(b.cluster) || a.id.localeCompare(b.id))
    .map((n) => n.id);
  const cols = Math.max(1, Math.ceil(Math.sqrt(ids.length)));
  const rows = Math.ceil(ids.length / cols);
  const x0 = 60;
  const x1 = 560;
  const y0 = 100;
  const y1 = 372;
  const dx = cols > 1 ? (x1 - x0) / (cols - 1) : 0;
  const dy = rows > 1 ? (y1 - y0) / (rows - 1) : 0;
  const out: Record<string, { x: number; y: number }> = {};
  ids.forEach((id, i) => {
    out[id] = { x: Math.round(x0 + (i % cols) * dx), y: Math.round(y0 + Math.floor(i / cols) * dy) };
  });
  return out;
}

function shortLabel(label: string): string {
  return label.length > 15 ? `${label.slice(0, 14)}…` : label;
}

export function DepGraph({ graph }: { graph: RepoAnalysis["graph"] }) {
  const [hover, setHover] = useState<string | null>(null);

  const demoLayout = graph.nodes.length > 0 && graph.nodes.every((n) => NODE_POS[n.id]);
  const positions = demoLayout ? NODE_POS : gridLayout(graph.nodes);
  const clusterColor = new Map(graph.clusters.map((c) => [c.id, c.color]));
  const connected = (id: string) =>
    hover === id ||
    graph.edges.some((e) => (e.from === hover && e.to === id) || (e.to === hover && e.from === id));

  return (
    <Panel label="ARCHITECTURE GRAPH — MODULE IMPORTS" meta={<span className="flex items-center gap-2"><DemoBadge />{graph.nodes.length} NODES · {graph.edges.length} EDGES{graph.omittedModules ? ` · +${graph.omittedModules} NOT SHOWN` : ""}</span>}>
      <div className="tech-grid-fine relative">
        <svg viewBox="0 0 660 430" className="block w-full" role="img" aria-label="Dependency graph of repository modules">
          <defs>
            <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L8 4 L0 8 Z" fill="var(--color-muted)" />
            </marker>
            <marker id="arrow-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L8 4 L0 8 Z" fill="var(--color-violet)" />
            </marker>
          </defs>

          {/* cluster zones — only meaningful for the fixed demo layout */}
          {demoLayout &&
            Object.entries(CLUSTER_ZONE).map(([id, z]) => (
              <g key={id}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} fill="none" stroke="var(--color-line-strong)" strokeDasharray="4 3" />
                <text
                  x={z.x + 6}
                  y={z.y - 6}
                  fontSize="9"
                  letterSpacing="2"
                  fontFamily="var(--font-jetbrains-mono)"
                  fill={clusterColor.get(id) ?? "var(--color-muted)"}
                >
                  ▪ {z.label}
                </text>
              </g>
            ))}

          {/* live graphs: cluster legend from the analysed repository */}
          {!demoLayout &&
            graph.clusters.map((c, i) => (
              <g key={c.id} transform={`translate(${40 + i * 120}, 20)`}>
                <rect width={8} height={8} fill={c.color} />
                <text x={13} y={8} fontSize="9" letterSpacing="1.5" fontFamily="var(--font-jetbrains-mono)" fill="var(--color-muted)">
                  {c.label}
                </text>
              </g>
            ))}

          {/* edges */}
          {graph.edges.map((e, i) => {
            const a = positions[e.from];
            const b = positions[e.to];
            if (!a || !b) return null;
            const hot = hover === e.from || hover === e.to;
            return (
              <line
                key={i}
                x1={a.x + NODE_W / 2}
                y1={a.y + NODE_H / 2}
                x2={b.x + NODE_W / 2}
                y2={b.y + NODE_H / 2}
                stroke={hot ? "var(--color-violet)" : "var(--color-line-strong)"}
                strokeWidth={hot ? 1.5 : 1}
                markerEnd={hot ? "url(#arrow-hot)" : "url(#arrow)"}
                opacity={hover && !hot ? 0.25 : 1}
              />
            );
          })}

          {/* nodes */}
          {graph.nodes.map((n) => {
            const pos = positions[n.id];
            if (!pos) return null;
            const color = clusterColor.get(n.cluster) ?? "var(--color-muted)";
            const dim = hover !== null && !connected(n.id);
            const isExternal = n.kind === "external";
            return (
              <g
                key={n.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                opacity={dim ? 0.3 : 1}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                className="cursor-crosshair"
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  fill={n.cluster === "packages" ? "var(--color-acid)" : "var(--color-paper)"}
                  stroke={color}
                  strokeWidth={connected(n.id) && hover ? 1.5 : 1}
                  strokeDasharray={isExternal ? "3 2" : undefined}
                />
                <text
                  x={NODE_W / 2}
                  y={NODE_H / 2 + 3}
                  textAnchor="middle"
                  fontSize={n.label.length > 15 ? 8 : 10}
                  fontFamily="var(--font-jetbrains-mono)"
                  fill="var(--color-ink)"
                >
                  {shortLabel(n.label)}
                </text>
              </g>
            );
          })}

          <text x={12} y={420} fontSize="9" letterSpacing="1.5" fontFamily="var(--font-jetbrains-mono)" fill="var(--color-muted)">
            NODE = MODULE · EDGE = IMPORT · DASHED = EXTERNAL · HOVER TO TRACE
          </text>
        </svg>
      </div>
      {graph.edges.length === 0 && (
        <p className="border-t border-line px-4 py-2 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-muted">
          NO IMPORT EDGES MAPPED FROM THE INSPECTED FILES — NODES ARE REAL, EDGES ARE OMITTED RATHER THAN INVENTED
        </p>
      )}
    </Panel>
  );
}

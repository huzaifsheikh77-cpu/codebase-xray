"use client";

import { Panel } from "@/components/ui/panel";
import { DemoBadge } from "@/components/ui/demo-badge";

/**
 * Isometric block map of the fictional repository.
 * Pure SVG — deterministic, art-directed geometry, no WebGL.
 * Face shading is done with black overlays so block colors come from
 * cluster tokens only.
 */

type ClusterId = "apps" | "packages" | "shared" | "external";

interface Block {
  x: number;
  y: number;
  h: number; // cube height in px
  cluster: ClusterId;
  label?: string;
}

const BLOCKS: Block[] = [
  // apps — violet
  { x: 1, y: 1, h: 58, cluster: "apps", label: "WEB" },
  { x: 2, y: 1, h: 34, cluster: "apps" },
  { x: 3, y: 1, h: 22, cluster: "apps" },
  { x: 1, y: 2, h: 46, cluster: "apps", label: "API" },
  { x: 2, y: 2, h: 26, cluster: "apps" },
  // packages — acid
  { x: 5, y: 1, h: 66, cluster: "packages", label: "CORE" },
  { x: 6, y: 1, h: 38, cluster: "packages", label: "UI" },
  { x: 7, y: 1, h: 30, cluster: "packages", label: "CLI" },
  { x: 5, y: 2, h: 24, cluster: "packages" },
  { x: 6, y: 2, h: 18, cluster: "packages" },
  { x: 8, y: 2, h: 14, cluster: "packages" },
  // shared — ink
  { x: 1, y: 6, h: 30, cluster: "shared", label: "LIB" },
  { x: 2, y: 6, h: 20, cluster: "shared", label: "SCRIPTS" },
  { x: 1, y: 7, h: 14, cluster: "shared" },
  // external — muted
  { x: 5, y: 6, h: 22, cluster: "external", label: "REACT" },
  { x: 6, y: 6, h: 18, cluster: "external", label: "FASTIFY" },
  { x: 7, y: 6, h: 16, cluster: "external", label: "ZOD" },
  { x: 8, y: 6, h: 20, cluster: "external", label: "DRIZZLE" },
  { x: 5, y: 7, h: 12, cluster: "external" },
  { x: 7, y: 7, h: 10, cluster: "external" },
];

const CLUSTER_COLOR: Record<ClusterId, string> = {
  apps: "var(--color-violet)",
  packages: "var(--color-acid)",
  shared: "var(--color-ink)",
  external: "var(--color-muted)",
};

const LINKS: { from: [number, number]; to: [number, number] }[] = [
  { from: [1, 1], to: [6, 1] }, // web → ui
  { from: [1, 1], to: [5, 1] }, // web → core
  { from: [1, 2], to: [5, 1] }, // api → core
  { from: [7, 1], to: [5, 1] }, // cli → core
  { from: [2, 6], to: [1, 6] }, // scripts → lib
  { from: [1, 2], to: [1, 6] }, // api → lib
];

const ORIGIN_X = 330;
const ORIGIN_Y = 118;
const HALF_W = 34;
const HALF_H = 17;

function ground(x: number, y: number): [number, number] {
  return [ORIGIN_X + (x - y) * HALF_W, ORIGIN_Y + (x + y) * HALF_H];
}

export function IsoMap() {
  const W = 660;
  const H = 470;

  // draw order: back-to-front
  const sorted = [...BLOCKS].sort((a, b) => a.x + a.y - (b.x + b.y));

  // ground grid diamonds
  const gridCells: string[] = [];
  for (let x = 0; x <= 9; x++) {
    for (let y = 0; y <= 8; y++) {
      const [cx, cy] = ground(x, y);
      gridCells.push(
        `M ${cx} ${cy - HALF_H} L ${cx + HALF_W} ${cy} L ${cx} ${cy + HALF_H} L ${cx - HALF_W} ${cy} Z`
      );
    }
  }

  return (
    <Panel label="ISO PROJECTION — MODULE MASS" meta={<span className="flex items-center gap-2"><DemoBadge />8 SECTORS</span>}>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Isometric map of repository modules">
          {/* ground grid */}
          <path d={gridCells.join(" ")} fill="none" stroke="var(--color-line)" strokeWidth="1" />

          {/* dashed dependency links along the ground */}
          {LINKS.map((l, i) => {
            const [x1, y1] = ground(l.from[0], l.from[1]);
            const [x2, y2] = ground(l.to[0], l.to[1]);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-violet)" strokeWidth="1" strokeDasharray="3 3" opacity={0.5} />;
          })}

          {/* cubes */}
          {sorted.map((b, i) => {
            const [cx, cy] = ground(b.x, b.y);
            const color = CLUSTER_COLOR[b.cluster];
            const topY = cy - b.h;
            const top = `M ${cx} ${topY - HALF_H} L ${cx + HALF_W} ${topY} L ${cx} ${topY + HALF_H} L ${cx - HALF_W} ${topY} Z`;
            const left = `M ${cx - HALF_W} ${topY} L ${cx} ${topY + HALF_H} L ${cx} ${cy + HALF_H} L ${cx - HALF_W} ${cy} Z`;
            const right = `M ${cx + HALF_W} ${topY} L ${cx} ${topY + HALF_H} L ${cx} ${cy + HALF_H} L ${cx + HALF_W} ${cy} Z`;
            return (
              <g key={i}>
                <path d={top} fill={color} stroke="var(--color-ink)" strokeWidth="0.75" />
                <path d={left} fill={color} stroke="var(--color-ink)" strokeWidth="0.75" />
                <path d={left} fill="#000" opacity={0.32} />
                <path d={right} fill={color} stroke="var(--color-ink)" strokeWidth="0.75" />
                <path d={right} fill="#000" opacity={0.5} />
                {b.label && (
                  <>
                    <line x1={cx} y1={topY - HALF_H - 2} x2={cx} y2={topY - HALF_H - 12} stroke="var(--color-ink)" strokeWidth="1" />
                    <text
                      x={cx}
                      y={topY - HALF_H - 16}
                      textAnchor="middle"
                      fontSize="9"
                      letterSpacing="1.5"
                      fontFamily="var(--font-jetbrains-mono)"
                      fill="var(--color-ink)"
                    >
                      {b.label}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* frame metadata */}
          <text x={12} y={H - 12} fontSize="9" letterSpacing="1.5" fontFamily="var(--font-jetbrains-mono)" fill="var(--color-muted)">
            ISO PROJECTION // MASS = MODULE SIZE // LINK = IMPORT
          </text>
          <text x={W - 12} y={20} fontSize="9" letterSpacing="1.5" textAnchor="end" fontFamily="var(--font-jetbrains-mono)" fill="var(--color-muted)">
            GRID 10×9 // SCALE 1:1248 FILES
          </text>
        </svg>

        {/* legend */}
        <div className="absolute right-3 top-3 flex flex-col gap-1.5 border border-line bg-paper/90 px-2.5 py-2">
          {(Object.entries(CLUSTER_COLOR) as [ClusterId, string][]).map(([id, color]) => (
            <span key={id} className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              <span aria-hidden className="inline-block size-2" style={{ backgroundColor: color }} />
              {id}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

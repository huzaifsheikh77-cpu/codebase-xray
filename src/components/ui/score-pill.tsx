import type { Score } from "@/lib/types/analysis";
import { BAND_COLOR, BAND_LABEL } from "@/lib/utils/format";

interface ScorePillProps {
  score: Score;
  /** text size class for the numeric value, e.g. "text-4xl" */
  className?: string;
}

/** Big score number + band chip. */
export function ScorePill({ score, className }: ScorePillProps) {
  const color = BAND_COLOR[score.band];
  return (
    <div className="flex items-baseline gap-3">
      <span className={`font-mono font-bold leading-none tracking-tight ${className ?? "text-4xl"}`}>
        {score.value}
      </span>
      <span
        className="border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em]"
        style={{ color, borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
      >
        {BAND_LABEL[score.band]}
      </span>
    </div>
  );
}

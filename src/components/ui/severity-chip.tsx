import type { Severity } from "@/lib/types/analysis";

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "var(--color-critical)",
  high: "var(--color-high)",
  medium: "var(--color-medium)",
  low: "var(--color-low)",
};

interface SeverityChipProps {
  severity: Severity;
  className?: string;
}

export function SeverityChip({ severity, className }: SeverityChipProps) {
  const color = SEVERITY_COLOR[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${className ?? ""}`}
      style={{ color, borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      <span className="inline-block size-1 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {severity}
    </span>
  );
}

export { SEVERITY_COLOR };

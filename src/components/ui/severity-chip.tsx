import type { Severity } from "@/lib/types/analysis";

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "var(--color-critical)",
  high: "var(--color-high)",
  medium: "var(--color-medium)",
  low: "var(--color-low)",
};

/** Accessible text shades; the brighter SEVERITY_COLOR values are borders/dots. */
const SEVERITY_TEXT_COLOR: Record<Severity, string> = {
  critical: "var(--color-severity-critical-text)",
  high: "var(--color-severity-high-text)",
  medium: "var(--color-severity-medium-text)",
  low: "var(--color-severity-low-text)",
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
      style={{
        color: SEVERITY_TEXT_COLOR[severity],
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      <span className="inline-block size-1 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {severity}
    </span>
  );
}

export { SEVERITY_COLOR };

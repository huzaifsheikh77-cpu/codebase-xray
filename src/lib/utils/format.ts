import type { Band } from "@/lib/types/analysis";

/** 1248 → "1,248" · 412000 → "412,000" */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** 10240 → "10.0 KB" · 3145728 → "3.0 MB" */
export function formatKb(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

/** ISO timestamp → "14:32:07" local clock */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour12: false });
}

/** ISO timestamp → "2026-03-14" */
export function formatDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** seconds elapsed → "00:05.42" */
export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${String(s).padStart(2, "0")}:${String(cs).padStart(2, "0")}`;
}

/** index → "01", "07" */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export const BAND_COLOR: Record<Band, string> = {
  excellent: "var(--color-acid)",
  good: "var(--color-acid)",
  fair: "var(--color-amber)",
  weak: "var(--color-violet)",
  critical: "var(--color-critical)",
};

export const BAND_LABEL: Record<Band, string> = {
  excellent: "EXCELLENT",
  good: "GOOD",
  fair: "FAIR",
  weak: "WEAK",
  critical: "CRITICAL",
};

export const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

type IssueSeverity = "critical" | "high" | "medium" | "low";

import type { Sector } from "@/lib/types/analysis";
import { SECTOR_WEIGHTS } from "./weights";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Overall = documented weighted mean of the six sector scores. */
export function overallScore(sectors: Sector[]): { value: number; band: Sector["score"]["band"] } {
  const byId = new Map(sectors.map((s) => [s.id, s.score.value]));
  let total = 0;
  for (const [id, weight] of Object.entries(SECTOR_WEIGHTS)) {
    total += weight * (byId.get(id as Sector["id"]) ?? 50);
  }
  const value = Math.round(clamp(total, 0, 100));
  const band: Sector["score"]["band"] =
    value >= 85 ? "excellent" : value >= 70 ? "good" : value >= 50 ? "fair" : value >= 30 ? "weak" : "critical";
  return { value, band };
}

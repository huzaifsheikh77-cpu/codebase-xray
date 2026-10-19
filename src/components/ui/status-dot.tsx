import type { ServiceStatus } from "@/lib/types/analysis";

const STATUS_COLOR: Record<ServiceStatus, string> = {
  connected: "var(--color-acid)",
  ready: "var(--color-acid)",
  degraded: "var(--color-amber)",
  offline: "var(--color-critical)",
};

/** Status indicator dot; pulses only for connected/ready services. */
export function StatusDot({ status }: { status: ServiceStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      aria-hidden
      className={`inline-block size-2 rounded-full ${status === "connected" || status === "ready" ? "animate-dot-pulse" : ""}`}
      style={{ backgroundColor: color, color }}
    />
  );
}

export { STATUS_COLOR };

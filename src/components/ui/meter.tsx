"use client";

import { useEffect, useState } from "react";

interface MeterProps {
  value: number; // 0–100
  color?: string;
  className?: string;
  /** ms for the fill animation */
  duration?: number;
  /** delay before the fill starts */
  delay?: number;
}

/** Interactive-free meter that animates its fill on mount. */
export function Meter({ value, color = "var(--color-acid)", className, duration = 900, delay = 100 }: MeterProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(value));
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const tickCount = 20;

  return (
    <div
      className={`relative h-2 w-full overflow-hidden border border-line bg-bg ${className ?? ""}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* background ruler ticks */}
      <div aria-hidden className="absolute inset-0 flex justify-between opacity-40">
        {Array.from({ length: tickCount + 1 }).map((_, i) => (
          <span key={i} className="h-full w-px bg-line-strong" />
        ))}
      </div>
      {/* fill */}
      <div
        className="absolute inset-y-0 left-0 transition-[width] ease-out"
        style={{
          width: `${width}%`,
          backgroundColor: color,
          transitionDuration: `${duration}ms`,
          transitionDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}

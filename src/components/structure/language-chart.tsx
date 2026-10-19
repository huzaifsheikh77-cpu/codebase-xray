"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface LanguageDatum {
  name: string;
  pct: number;
  color: string;
}

/** Statistical language distribution — the one sanctioned Recharts usage. */
export function LanguageChart({ data }: { data: LanguageDatum[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Language distribution bar chart">
      <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 40, bottom: 4, left: 0 }}
        barCategoryGap={6}
      >
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={92}
          axisLine={{ stroke: "var(--color-line-strong)" }}
          tickLine={false}
          tick={{ fill: "var(--color-ink)", fontSize: 10, fontFamily: "var(--font-jetbrains-mono)" }}
        />
        <Bar dataKey="pct" isAnimationActive background={{ fill: "var(--color-bg)" }} radius={[0, 1, 1, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

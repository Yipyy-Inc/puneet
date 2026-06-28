"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ModuleAdoptionRow } from "@/lib/api/facilities-report";

export function FeatureAdoptionChart({
  data,
  height = 380,
}: {
  data: ModuleAdoptionRow[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 28, left: 8, bottom: 0 }}
        barGap={2}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          className="stroke-border/40"
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          type="category"
          dataKey="module"
          width={150}
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <Tooltip
          cursor={{ fill: "currentColor", opacity: 0.05 }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
          formatter={(value, name) => [`${value}%`, name as string]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="enabledPct"
          name="Enabled"
          fill="#6366f1"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="activeUsingPct"
          name="Actively using"
          fill="#10b981"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

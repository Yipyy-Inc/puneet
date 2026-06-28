"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ResolutionPoint } from "@/lib/api/support-report";

export function ResolutionTrendChart({
  data,
  height = 280,
}: {
  data: ResolutionPoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={(v) => `${v}h`}
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
          width={40}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
          formatter={(value) => [`${value} hrs`, "Avg resolution"]}
        />
        <Line
          type="monotone"
          dataKey="hours"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

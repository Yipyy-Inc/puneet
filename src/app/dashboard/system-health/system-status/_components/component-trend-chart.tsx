"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendSample } from "@/lib/monitoring/types";

export function ComponentTrendChart({
  samples,
  kind,
  height = 220,
}: {
  samples: TrendSample[];
  kind: "resource" | "latency";
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={samples}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 10, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
          minTickGap={24}
        />
        {kind === "resource" ? (
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: "currentColor" }}
            stroke="currentColor"
            className="text-muted-foreground"
            width={40}
          />
        ) : (
          <YAxis
            tickFormatter={(v) => `${v}ms`}
            tick={{ fontSize: 10, fill: "currentColor" }}
            stroke="currentColor"
            className="text-muted-foreground"
            width={48}
          />
        )}
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {kind === "resource" ? (
          <>
            <Line
              type="monotone"
              dataKey="cpu"
              name="CPU %"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="mem"
              name="Memory %"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </>
        ) : (
          <Line
            type="monotone"
            dataKey="latency"
            name="Latency (ms)"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

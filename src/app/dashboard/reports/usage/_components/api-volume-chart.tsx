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

import type { ApiVolumePoint } from "@/lib/api/usage-report";

const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`);

export function ApiVolumeChart({
  data,
  height = 300,
}: {
  data: ApiVolumePoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="day"
          interval={3}
          minTickGap={16}
          tick={{ fontSize: 10, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          yAxisId="req"
          tickFormatter={fmtK}
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
          width={44}
        />
        <YAxis
          yAxisId="ms"
          orientation="right"
          tickFormatter={(v) => `${v}ms`}
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
          width={48}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
          formatter={(value, name) =>
            name === "Requests"
              ? [Number(value).toLocaleString(), "Requests"]
              : [`${value} ms`, "Avg response"]
          }
        />
        <Line
          yAxisId="req"
          type="monotone"
          dataKey="requests"
          name="Requests"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="ms"
          type="monotone"
          dataKey="responseMs"
          name="Response time"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

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

import type { MrrMovementPoint } from "@/lib/api/business-report";

const LINES = [
  { key: "newMrr", name: "New MRR", color: "#10b981", width: 2 },
  { key: "expansionMrr", name: "Expansion MRR", color: "#6366f1", width: 2 },
  { key: "churnedMrr", name: "Churned MRR", color: "#e11d48", width: 2 },
  { key: "netMrr", name: "Net MRR", color: "#8b5cf6", width: 3 },
];

function fmtAxis(v: number): string {
  const a = Math.abs(v);
  const s = a >= 1000 ? `$${(a / 1000).toFixed(1)}k` : `$${a}`;
  return v < 0 ? `-${s}` : s;
}

export function MrrTrendChart({
  data,
  height = 320,
}: {
  data: MrrMovementPoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={(v) => fmtAxis(Number(v))}
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
          width={56}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
          formatter={(value, name) => [
            `$${Number(value).toLocaleString()}`,
            name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {LINES.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.name}
            stroke={l.color}
            strokeWidth={l.width}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

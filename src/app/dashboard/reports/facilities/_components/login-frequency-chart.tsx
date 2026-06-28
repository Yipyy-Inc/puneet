"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LoginBucket } from "@/lib/api/facilities-report";

// Daily → Never : engaged (green) to dormant (red).
const COLORS = ["#10b981", "#84cc16", "#f59e0b", "#f97316", "#e11d48"];

export function LoginFrequencyChart({
  data,
  height = 300,
}: {
  data: LoginBucket[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
          width={36}
        />
        <Tooltip
          cursor={{ fill: "currentColor", opacity: 0.05 }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
          formatter={(value) => [`${value} facilities`, "Facilities"]}
        />
        <Bar dataKey="facilities" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={d.bucket} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

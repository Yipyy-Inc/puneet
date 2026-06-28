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

import type { TicketVolumeWeek } from "@/lib/api/support-report";

const PRIORITIES: { key: keyof TicketVolumeWeek; color: string }[] = [
  { key: "Low", color: "#94a3b8" },
  { key: "Medium", color: "#6366f1" },
  { key: "High", color: "#f59e0b" },
  { key: "Urgent", color: "#ef4444" },
];

export function TicketVolumeChart({
  data,
  height = 300,
}: {
  data: TicketVolumeWeek[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="week"
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
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {PRIORITIES.map((p) => (
          <Bar
            key={p.key}
            dataKey={p.key}
            stackId="tickets"
            fill={p.color}
            radius={p.key === "Urgent" ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

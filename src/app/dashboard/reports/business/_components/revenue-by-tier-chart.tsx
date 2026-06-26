"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { TierSlice } from "@/lib/api/business-report";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#0ea5e9"];

export function RevenueByTierChart({
  data,
  height = 300,
}: {
  data: TierSlice[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="mrr"
          nameKey="tier"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={2}
          label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
        >
          {data.map((d, i) => (
            <Cell key={d.tier} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
          formatter={(value, name) => [
            `$${Number(value).toLocaleString()}/mo`,
            name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

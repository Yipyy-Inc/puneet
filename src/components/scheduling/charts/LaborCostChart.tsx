"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  data: { date: string; cost: number; hours: number }[];
}

export function LaborCostChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[240px] items-center justify-center text-sm">
        No data for selected period.
      </div>
    );
  }
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(d: string) => d.slice(5)}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            formatter={(value, name) => {
              const v = typeof value === "number" ? value : 0;
              if (name === "cost") return [`$${v.toFixed(0)}`, "Cost"];
              if (name === "hours") return [`${v.toFixed(1)}h`, "Hours"];
              return [String(value), String(name)];
            }}
            contentStyle={{ fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="cost"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#costFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

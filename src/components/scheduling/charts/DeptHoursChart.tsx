"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  data: { name: string; hours: number; cost: number }[];
}

export function DeptHoursChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[200px] items-center justify-center text-sm">
        No data.
      </div>
    );
  }
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value, name) => {
              const v = typeof value === "number" ? value : 0;
              if (name === "hours") return [`${v}h`, "Hours"];
              if (name === "cost") return [`$${v}`, "Cost"];
              return [String(value), String(name)];
            }}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

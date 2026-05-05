"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { Location } from "@/types/location";

interface Props {
  data: { month: string; [locationId: string]: number | string }[];
  locations: Location[];
  height?: number;
}

export function RevenueTrendLineChart({ data, locations, height = 280 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
          formatter={(value, name) => {
            const loc = locations.find((l) => l.id === name);
            return [
              `$${Number(value ?? 0).toLocaleString()}`,
              loc?.name ?? String(name),
            ];
          }}
        />
        <Legend
          formatter={(value: string) => {
            const loc = locations.find((l) => l.id === value);
            return loc?.name ?? value;
          }}
          wrapperStyle={{ fontSize: 12 }}
        />
        {locations.map((loc) => (
          <Line
            key={loc.id}
            type="monotone"
            dataKey={loc.id}
            stroke={loc.color}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 2, fill: loc.color }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

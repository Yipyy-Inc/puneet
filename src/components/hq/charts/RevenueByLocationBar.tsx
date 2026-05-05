"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import type { Location } from "@/types/location";

interface Props {
  data: { locationId: string; locationName: string; revenue: number }[];
  locations: Location[];
  height?: number;
}

export function RevenueByLocationBar({ data, locations, height = 240 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
        <XAxis
          dataKey="locationName"
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
          formatter={(value) => [
            `$${Number(value ?? 0).toLocaleString()}`,
            "Revenue",
          ]}
        />
        <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
          {data.map((entry) => {
            const loc = locations.find((l) => l.id === entry.locationId);
            return <Cell key={entry.locationId} fill={loc?.color ?? "#0ea5e9"} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

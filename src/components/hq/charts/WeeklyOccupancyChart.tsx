"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { Location } from "@/types/location";

interface Props {
  data: {
    week: string;
    [locationId: string]: number | string;
  }[];
  locations: Location[];
  height?: number;
  /** When true, render the chart with axes that emphasize percentage scale. */
  isPercentage?: boolean;
}

export function WeeklyOccupancyChart({
  data,
  locations,
  height = 240,
  isPercentage = true,
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        barCategoryGap={20}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 10, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          domain={isPercentage ? [0, 100] : undefined}
          tickFormatter={(v) => (isPercentage ? `${v}%` : String(v))}
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
            const num = Number(value ?? 0);
            return [
              isPercentage ? `${num}%` : String(num),
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
          <Bar
            key={loc.id}
            dataKey={loc.id}
            fill={loc.color}
            radius={[6, 6, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

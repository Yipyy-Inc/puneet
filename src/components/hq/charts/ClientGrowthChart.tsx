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
import { hexFromKey } from "@/lib/hq/location-styles";

interface Props {
  /** New vs returning clients per location (X-axis = location short code). */
  data: { name: string; new: number; returning: number }[];
  height?: number;
}

const NEW_COLOR = hexFromKey("sky"); // Navy
const RETURNING_COLOR = hexFromKey("emerald"); // Sage

export function ClientGrowthChart({ data, height = 280 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        barCategoryGap={24}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-border/40"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
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
          formatter={(value, name) => [
            Number(value ?? 0).toLocaleString(),
            name,
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="new"
          name="New clients"
          fill={NEW_COLOR}
          radius={[6, 6, 0, 0]}
        />
        <Bar
          dataKey="returning"
          name="Returning clients"
          fill={RETURNING_COLOR}
          radius={[6, 6, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

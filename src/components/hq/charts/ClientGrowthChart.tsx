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
import {
  ReportTooltip,
  axisTick,
  axisLabel,
  gridProps,
  legendProps,
  tickFmt,
} from "@/components/reports/chart-kit";

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
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="name"
          tick={axisTick}
          label={axisLabel("Location", "x")}
        />
        <YAxis
          tick={axisTick}
          tickFormatter={tickFmt("compactNumber")}
          label={axisLabel("Clients", "y")}
        />
        <Tooltip content={<ReportTooltip format="number" />} />
        <Legend {...legendProps} />
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

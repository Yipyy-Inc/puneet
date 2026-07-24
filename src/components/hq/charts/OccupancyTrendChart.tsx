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
  /** One focused location's boarding + daycare occupancy over time. */
  data: { week: string; boarding: number; daycare: number }[];
  height?: number;
}

const SERIES = [
  { key: "boarding", label: "Boarding", color: hexFromKey("sky") }, // Navy
  { key: "daycare", label: "Daycare", color: hexFromKey("violet") }, // Teal
];

export function OccupancyTrendChart({ data, height = 280 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="week" tick={axisTick} label={axisLabel("Week", "x")} />
        <YAxis
          domain={[0, 100]}
          tick={axisTick}
          tickFormatter={tickFmt("percent")}
          label={axisLabel("Occupancy %", "y")}
        />
        <Tooltip content={<ReportTooltip format="percent" />} />
        <Legend {...legendProps} />
        {SERIES.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 2, fill: s.color }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

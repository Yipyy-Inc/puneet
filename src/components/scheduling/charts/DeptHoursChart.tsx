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

import {
  axisLabel,
  axisTick,
  chartColor,
  gridProps,
  legendProps,
  ReportTooltip,
  tickFmt,
} from "@/components/reports/chart-kit";

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
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="name"
            tick={axisTick}
            label={axisLabel("Department", "x")}
          />
          <YAxis
            tick={axisTick}
            tickFormatter={tickFmt("compactNumber")}
            label={axisLabel("Hours", "y")}
          />
          <Tooltip
            content={
              <ReportTooltip format={{ hours: "number", cost: "currency" }} />
            }
          />
          <Legend {...legendProps} />
          <Bar dataKey="hours" fill={chartColor(1)} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

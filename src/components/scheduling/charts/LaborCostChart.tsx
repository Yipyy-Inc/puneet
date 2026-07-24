"use client";

import {
  Area,
  AreaChart,
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
  const fill = chartColor(0);
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fill} stopOpacity={0.4} />
              <stop offset="95%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis
            dataKey="date"
            tick={axisTick}
            tickFormatter={(d: string) => d.slice(5)}
            label={axisLabel("Date", "x")}
          />
          <YAxis
            tick={axisTick}
            tickFormatter={tickFmt("compactCurrency")}
            label={axisLabel("Labor Cost", "y")}
          />
          <Tooltip
            content={
              <ReportTooltip format={{ cost: "currency", hours: "number" }} />
            }
          />
          <Legend {...legendProps} />
          <Area
            type="monotone"
            dataKey="cost"
            stroke={fill}
            strokeWidth={2}
            fill="url(#costFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

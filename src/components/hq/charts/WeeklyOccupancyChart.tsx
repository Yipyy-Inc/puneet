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
import { locationHex } from "@/lib/hq/location-styles";
import {
  ReportTooltip,
  axisTick,
  axisLabel,
  gridProps,
  legendProps,
  tickFmt,
} from "@/components/reports/chart-kit";

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
  const locName = (id: string) =>
    locations.find((l) => l.id === id)?.name ?? id;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        barCategoryGap={20}
      >
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="week" tick={axisTick} label={axisLabel("Week", "x")} />
        <YAxis
          domain={isPercentage ? [0, 100] : undefined}
          tick={axisTick}
          tickFormatter={tickFmt(isPercentage ? "percent" : "compactNumber")}
          label={axisLabel(isPercentage ? "Occupancy %" : "Occupancy", "y")}
        />
        <Tooltip
          content={
            <ReportTooltip
              format={isPercentage ? "percent" : "number"}
              nameFormatter={locName}
            />
          }
        />
        <Legend
          {...legendProps}
          formatter={(value: string) => locName(value)}
        />
        {locations.map((loc) => (
          <Bar
            key={loc.id}
            dataKey={loc.id}
            fill={locationHex(loc)}
            radius={[6, 6, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

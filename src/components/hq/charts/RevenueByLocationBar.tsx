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
  Cell,
} from "recharts";
import { locationHex } from "@/lib/hq/location-styles";
import {
  ReportTooltip,
  axisTick,
  axisLabel,
  gridProps,
  legendProps,
  tickFmt,
} from "@/components/reports/chart-kit";

interface ChartLocation {
  id: string;
  name: string;
  color?: string | null;
  shortCode?: string | null;
}

interface Props {
  data: { locationId: string; locationName: string; revenue: number }[];
  locations: ChartLocation[];
  height?: number;
}

export function RevenueByLocationBar({ data, locations, height = 240 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="locationName"
          tick={axisTick}
          label={axisLabel("Location", "x")}
        />
        <YAxis
          tick={axisTick}
          tickFormatter={tickFmt("compactCurrency")}
          label={axisLabel("Revenue", "y")}
        />
        <Tooltip content={<ReportTooltip format="currency" />} />
        <Legend {...legendProps} />
        <Bar dataKey="revenue" name="Revenue" radius={[8, 8, 0, 0]}>
          {data.map((entry) => {
            const loc = locations.find((l) => l.id === entry.locationId);
            return (
              <Cell key={entry.locationId} fill={locationHex(loc ?? {})} />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

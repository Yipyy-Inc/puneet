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
  ReferenceLine,
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
  data: { month: string; [locationId: string]: number | string }[];
  locations: Location[];
  /** Network-average NPS — drawn as a horizontal reference line. */
  average: number;
  height?: number;
}

export function NpsTrendChart({
  data,
  locations,
  average,
  height = 280,
}: Props) {
  const locName = (id: string) =>
    locations.find((l) => l.id === id)?.name ?? id;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="month"
          tick={axisTick}
          label={axisLabel("Month", "x")}
        />
        <YAxis
          domain={[60, 100]}
          tick={axisTick}
          tickFormatter={tickFmt("number")}
          label={axisLabel("NPS", "y")}
        />
        <Tooltip
          content={<ReportTooltip format="number" nameFormatter={locName} />}
        />
        <Legend
          {...legendProps}
          formatter={(value: string) => locName(value)}
        />
        <ReferenceLine
          y={average}
          strokeDasharray="4 4"
          className="stroke-muted-foreground"
          label={{
            value: `Network avg ${average}`,
            position: "insideTopRight",
            fontSize: 11,
            fill: "currentColor",
            className: "text-muted-foreground",
          }}
        />
        {locations.map((loc) => (
          <Line
            key={loc.id}
            type="monotone"
            dataKey={loc.id}
            stroke={locationHex(loc)}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 2, fill: locationHex(loc) }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

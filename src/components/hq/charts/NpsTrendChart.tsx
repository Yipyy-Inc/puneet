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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          domain={[60, 100]}
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
            return [Number(value ?? 0), loc?.name ?? String(name)];
          }}
        />
        <Legend
          formatter={(value: string) => {
            const loc = locations.find((l) => l.id === value);
            return loc?.name ?? value;
          }}
          wrapperStyle={{ fontSize: 12 }}
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

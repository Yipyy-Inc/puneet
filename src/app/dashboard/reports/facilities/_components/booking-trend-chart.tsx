"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BookingWeekPoint } from "@/lib/api/facilities-report";

export function BookingTrendChart({
  data,
  height = 300,
}: {
  data: BookingWeekPoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="bookingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="label"
          interval={3}
          minTickGap={16}
          tick={{ fontSize: 10, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
          width={44}
        />
        <Tooltip
          cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
          formatter={(value) => [`${value} bookings`, "Bookings"]}
          labelFormatter={(label) => `Week of ${label}`}
        />
        <Area
          type="monotone"
          dataKey="bookings"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#bookingFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

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

import type { ChatVolumePoint } from "@/lib/api/support-report";

export function ChatVolumeChart({
  data,
  height = 280,
}: {
  data: ChatVolumePoint[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="chatFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="day"
          interval={3}
          minTickGap={16}
          tick={{ fontSize: 10, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
          width={36}
        />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
          formatter={(value) => [`${value} messages`, "Chat"]}
        />
        <Area
          type="monotone"
          dataKey="messages"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#chatFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

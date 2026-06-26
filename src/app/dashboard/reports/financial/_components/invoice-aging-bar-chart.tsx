"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AgingBucket } from "@/lib/api/financial-report";

// Current → 90+ : green to red.
const COLORS = ["#10b981", "#84cc16", "#f59e0b", "#f97316", "#e11d48"];

export function InvoiceAgingBarChart({
  data,
  height = 280,
}: {
  data: AgingBucket[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={(v) => {
            const n = Number(v);
            return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
          }}
          tick={{ fontSize: 11, fill: "currentColor" }}
          stroke="currentColor"
          className="text-muted-foreground"
          width={52}
        />
        <Tooltip
          cursor={{ fill: "currentColor", opacity: 0.05 }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--popover))",
            fontSize: 12,
          }}
          formatter={(value, _name, item) => [
            `$${Number(value).toLocaleString()} · ${item?.payload?.count ?? 0} invoices`,
            "Outstanding",
          ]}
        />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={d.bucket} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

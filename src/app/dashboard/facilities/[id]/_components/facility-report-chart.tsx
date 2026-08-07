"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ReportTooltip,
  axisTick,
  chartColor,
  gridProps,
  legendProps,
  tickFmt,
} from "@/components/reports/chart-kit";
import type { ReportMonth } from "@/lib/api/facility-report";

// ============================================================================
// Bookings and takings on one pair of axes.
//
// Its own file because recharts is heavy and this is the only part of the tab
// that needs it — the parent imports it through next/dynamic so opening the
// Reports tab is what loads the library, not opening the facility.
//
// Bars for bookings and a line for revenue, on separate axes: they are counts
// and money, and forcing them onto one scale would make whichever is smaller
// look like nothing. Cancellations are stacked into the bar rather than shown
// beside it, because the honest question is "how much of that month was
// cancelled", not "how do the two totals compare".
// ============================================================================

export function FacilityReportChart({ months }: { months: ReportMonth[] }) {
  const data = months.map((month) => ({
    month: month.month,
    kept: month.bookings - month.cancelled,
    cancelled: month.cancelled,
    revenue: month.revenueCents / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
      >
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="month"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="count"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          yAxisId="money"
          orientation="right"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          tickFormatter={tickFmt("compactCurrency")}
        />
        <Tooltip
          content={
            <ReportTooltip
              format={{
                kept: "number",
                cancelled: "number",
                revenue: "currency",
              }}
            />
          }
        />
        <Legend {...legendProps} />
        <Bar
          yAxisId="count"
          dataKey="kept"
          name="Bookings kept"
          stackId="bookings"
          fill={chartColor(0)}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          yAxisId="count"
          dataKey="cancelled"
          name="Cancelled"
          stackId="bookings"
          fill={chartColor(3)}
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="money"
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke={chartColor(1)}
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

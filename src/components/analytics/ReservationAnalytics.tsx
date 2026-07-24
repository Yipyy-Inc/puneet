"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, XCircle, Clock, UserX } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  chartColor,
  axisTick,
  gridProps,
  legendProps,
  axisLabel,
  ReportTooltip,
  tickFmt,
} from "@/components/reports/chart-kit";
import { formatCount, formatCurrency, formatPercent } from "@/lib/format";
import {
  bookingsByServiceOverTime,
  bookingSourceMix,
  bookingRates,
} from "@/lib/report-data-sources";
import {
  ReportRangePicker,
  defaultReportRange,
  formatRangeLabel,
  type ReportRange,
} from "@/components/reports/report-range-picker";

function fmtPeriod(p: string): string {
  if (/^\d{4}-\d{2}$/.test(p)) {
    const [y, m] = p.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", {
      month: "short",
    });
  }
  return p.length > 7 ? p.slice(5) : p;
}

export function ReservationAnalytics() {
  const [range, setRange] = useState<ReportRange>(() =>
    defaultReportRange("90d"),
  );
  const rates = bookingRates(range);
  const byService = bookingsByServiceOverTime(range, { granularity: "month" });
  const sources = bookingSourceMix(range);
  const rangeLabel = formatRangeLabel(range);

  const kpis = [
    {
      label: "Total Bookings",
      value: formatCount(rates.total),
      hint: rangeLabel,
      icon: Calendar,
      gradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    },
    {
      label: "Completion Rate",
      value: formatPercent(rates.completionRate),
      hint: `${formatCount(rates.completed)} completed`,
      icon: CheckCircle2,
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    },
    {
      label: "Cancellation Rate",
      value: formatPercent(rates.cancellationRate),
      hint: `${formatCount(rates.cancelled)} cancelled`,
      icon: XCircle,
      gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    },
    {
      label: "Avg Lead Time",
      value: `${rates.avgLeadTimeDays} d`,
      hint: "Book-to-visit (grooming)",
      icon: Clock,
      gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    },
  ];

  const statusRows = [
    {
      label: "Completed",
      count: rates.completed,
      rate: rates.completionRate,
      Icon: CheckCircle2,
      color: "bg-success",
      text: "text-success",
    },
    {
      label: "Cancelled",
      count: rates.cancelled,
      rate: rates.cancellationRate,
      Icon: XCircle,
      color: "bg-destructive",
      text: "text-destructive",
    },
    {
      label: "No-Shows",
      count: rates.noShows,
      rate: rates.noShowRate,
      Icon: UserX,
      color: "bg-warning",
      text: "text-warning",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Date-range control — drives every tile and chart below */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Reservation Analytics
          </h2>
          <p className="text-muted-foreground text-sm">{rangeLabel}</p>
        </div>
        <ReportRangePicker value={range} onChange={setRange} />
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-card border-0">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-muted-foreground mb-1 text-sm font-medium">
                    {kpi.label}
                  </p>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {kpi.value}
                  </h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {kpi.hint}
                  </p>
                </div>
                <div
                  className="flex size-11 items-center justify-center rounded-xl"
                  style={{ background: kpi.gradient }}
                >
                  <kpi.icon className="size-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bookings over time by service */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Bookings Over Time by Service
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Monthly booking volume split by service type
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {byService.data.every((row) =>
              byService.services.every((s) => Number(row[s]) === 0),
            ) ? (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                No bookings in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byService.data}>
                  <CartesianGrid {...gridProps} />
                  <XAxis
                    dataKey="period"
                    tick={axisTick}
                    tickFormatter={fmtPeriod}
                    label={axisLabel("Month", "x")}
                  />
                  <YAxis
                    tick={axisTick}
                    allowDecimals={false}
                    tickFormatter={tickFmt("compactNumber")}
                    label={axisLabel("Bookings", "y")}
                  />
                  <Tooltip content={<ReportTooltip format="number" />} />
                  <Legend {...legendProps} />
                  {byService.services.map((svc, i) => (
                    <Bar
                      key={svc}
                      dataKey={svc}
                      name={svc}
                      stackId="services"
                      fill={chartColor(i)}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking sources */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Booking Sources
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Online &amp; in-person from grooming; other bookings via staff
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {sources.length === 0 ? (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                  No bookings in this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sources}
                      dataKey="bookings"
                      nameKey="source"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {sources.map((s, i) => (
                        <Cell key={s.source} fill={chartColor(i)} />
                      ))}
                    </Pie>
                    <Tooltip content={<ReportTooltip format="number" />} />
                    <Legend {...legendProps} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* No-show + cancellation breakdown */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Outcomes &amp; Rates
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Completion, cancellation &amp; no-show rates
            </p>
          </CardHeader>
          <CardContent>
            {rates.total === 0 ? (
              <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
                No bookings in this period
              </div>
            ) : (
              <div className="space-y-4">
                {statusRows.map((row) => (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <row.Icon className={`size-4 ${row.text}`} />
                        <span className="font-medium">{row.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">
                          {formatCount(row.count)}
                        </span>
                        <span className="text-muted-foreground ml-2 text-sm">
                          ({formatPercent(row.rate)})
                        </span>
                      </div>
                    </div>
                    <div className="bg-muted h-2 w-full rounded-full">
                      <div
                        className={`h-2 rounded-full transition-all ${row.color}`}
                        style={{ width: `${Math.min(row.rate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="border-border mt-4 space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="text-success font-semibold">
                      {formatCurrency(rates.revenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Avg Booking Value
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(rates.avgBookingValue)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

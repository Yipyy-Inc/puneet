"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, TrendingUp, Award, Grid3x3 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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
  capacityUtilization,
  occupancy,
  bookingHeatmap,
} from "@/lib/report-data-sources";
import {
  ReportRangePicker,
  defaultReportRange,
  formatRangeLabel,
  type ReportRange,
} from "@/components/reports/report-range-picker";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 06:00–20:00

function hourLabel(h: number): string {
  const suffix = h < 12 ? "a" : "p";
  const base = h % 12 === 0 ? 12 : h % 12;
  return `${base}${suffix}`;
}

export function FacilityUtilizationMetrics() {
  const [range, setRange] = useState<ReportRange>(() =>
    defaultReportRange("90d"),
  );
  const rangeLabel = formatRangeLabel(range);
  const cap = capacityUtilization(range);
  const occ = occupancy(range);
  const heatmap = bookingHeatmap(range);

  const avgBoardingOcc =
    occ.length > 0
      ? occ.reduce((s, d) => s + d.occupancyRate, 0) / occ.length
      : 0;
  const peakBoardingOcc = occ.reduce((m, d) => Math.max(m, d.occupancyRate), 0);
  const totalRevenue = cap.reduce((s, c) => s + c.revenue, 0);
  const busiest = cap.reduce(
    (m, c) => (c.peakUtilizationRate > m.peakUtilizationRate ? c : m),
    cap[0] ?? { service: "—", peakUtilizationRate: 0 },
  );

  const utilChart = cap.map((c) => ({
    service: c.service,
    avg: c.utilizationRate,
    peak: c.peakUtilizationRate,
  }));

  const heatMax = heatmap.reduce((m, c) => Math.max(m, c.count), 0);
  const heatAt = (dow: number, hour: number) =>
    heatmap.find((c) => c.dow === dow && c.hour === hour)?.count ?? 0;

  const kpis = [
    {
      label: "Avg Boarding Occupancy",
      value: formatPercent(avgBoardingOcc),
      hint: "Daily kennel fill",
      icon: BedDouble,
      gradient: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    },
    {
      label: "Peak Boarding Occupancy",
      value: formatPercent(peakBoardingOcc),
      hint: "Busiest day in range",
      icon: TrendingUp,
      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    },
    {
      label: "Busiest Service",
      value: busiest.service,
      hint: `${formatPercent(busiest.peakUtilizationRate)} peak`,
      icon: Award,
      gradient: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    },
    {
      label: "Booking Revenue",
      value: formatCurrency(totalRevenue),
      hint: `Across services · ${rangeLabel}`,
      icon: TrendingUp,
      gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Date-range control — drives every tile and chart below */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Facility Utilization
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Utilization by service */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Utilization by Service
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Average &amp; peak daily occupancy vs capacity
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilChart}>
                  <CartesianGrid {...gridProps} />
                  <XAxis
                    dataKey="service"
                    tick={axisTick}
                    label={axisLabel("Service", "x")}
                  />
                  <YAxis
                    tick={axisTick}
                    tickFormatter={tickFmt("percent")}
                    label={axisLabel("Utilization", "y")}
                  />
                  <Tooltip content={<ReportTooltip format="percent" />} />
                  <Legend {...legendProps} />
                  <Bar
                    dataKey="avg"
                    name="Avg"
                    fill={chartColor(0)}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="peak"
                    name="Peak"
                    fill={chartColor(2)}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Boarding occupancy trend */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Boarding Occupancy Trend
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Daily kennel fill rate over the period
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={occ}>
                  <defs>
                    <linearGradient id="occTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={chartColor(0)}
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor={chartColor(0)}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridProps} />
                  <XAxis
                    dataKey="date"
                    tick={axisTick}
                    minTickGap={28}
                    tickFormatter={(v: string) => v.slice(5)}
                    label={axisLabel("Date", "x")}
                  />
                  <YAxis
                    tick={axisTick}
                    domain={[0, 100]}
                    tickFormatter={tickFmt("percent")}
                    label={axisLabel("Occupancy %", "y")}
                  />
                  <Tooltip content={<ReportTooltip format="percent" />} />
                  <Legend {...legendProps} />
                  <Area
                    type="monotone"
                    dataKey="occupancyRate"
                    name="Occupancy"
                    stroke={chartColor(0)}
                    fill="url(#occTrend)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day-of-week × hour heatmap */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Grid3x3 className="size-4" />
            Booking Heatmap
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Booking density by day of week &amp; hour of day
          </p>
        </CardHeader>
        <CardContent>
          {heatMax === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No bookings in this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[560px]">
                {/* Hour header */}
                <div className="flex">
                  <div className="w-10 shrink-0" />
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="text-muted-foreground flex-1 text-center text-[10px]"
                    >
                      {hourLabel(h)}
                    </div>
                  ))}
                </div>
                {/* Rows */}
                {DOW.map((day, dow) => (
                  <div key={day} className="flex items-center">
                    <div className="text-muted-foreground w-10 shrink-0 text-xs font-medium">
                      {day}
                    </div>
                    {HOURS.map((h) => {
                      const count = heatAt(dow, h);
                      const intensity = heatMax > 0 ? count / heatMax : 0;
                      return (
                        <div key={h} className="flex-1 p-0.5">
                          <div
                            className="flex aspect-square items-center justify-center rounded-sm text-[10px] font-medium"
                            style={{
                              // Sequential heat scale (intensity ramp).
                              backgroundColor:
                                count > 0
                                  ? `rgba(37, 99, 235, ${0.15 + 0.85 * intensity})`
                                  : "hsl(var(--muted))",
                              color:
                                intensity > 0.5
                                  ? "white"
                                  : "hsl(var(--muted-foreground))",
                            }}
                            title={`${day} ${hourLabel(h)}: ${count} booking${count === 1 ? "" : "s"}`}
                          >
                            {count > 0 ? count : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capacity used vs available + revenue per slot */}
      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Capacity &amp; Revenue per Slot
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Capacity used vs available and revenue per available slot
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {cap.map((c) => (
              <div
                key={c.service}
                className="bg-muted/30 hover:bg-muted/50 rounded-xl p-4 transition-colors"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-semibold">{c.service}</h4>
                    <p className="text-muted-foreground text-sm">
                      {formatCount(c.capacity)} slots ·{" "}
                      {formatCount(c.bookings)} bookings
                    </p>
                  </div>
                  <Badge
                    variant={
                      c.peakUtilizationRate >= 50 ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {formatPercent(c.peakUtilizationRate)} peak
                  </Badge>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-muted-foreground text-xs">Peak Used</p>
                    <p className="text-lg font-bold tabular-nums">
                      {formatCount(c.peakUsed)}/{formatCount(c.capacity)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Avg Used</p>
                    <p className="text-lg font-bold tabular-nums">
                      {c.avgUsed}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Rev / Slot</p>
                    <p className="text-lg font-bold tabular-nums">
                      {formatCurrency(c.revenuePerAvailableSlot)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Peak utilization
                    </span>
                    <span className="font-medium">
                      {formatPercent(c.peakUtilizationRate)}
                    </span>
                  </div>
                  <div className="bg-muted h-2 w-full rounded-full">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(c.peakUtilizationRate, 100)}%`,
                        backgroundColor: chartColor(0),
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

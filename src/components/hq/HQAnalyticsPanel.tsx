"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Bed,
  Sun,
} from "lucide-react";
import type { Location } from "@/types/location";
import {
  revenueTrend12Months,
  weeklyOccupancy,
  serviceMix,
  type WeeklyOccupancyRow,
} from "@/data/hq-analytics";

const RevenueTrendLineChart = dynamic(
  () =>
    import("./charts/RevenueTrendLineChart").then(
      (m) => m.RevenueTrendLineChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> },
);

const RevenueByLocationBar = dynamic(
  () =>
    import("./charts/RevenueByLocationBar").then((m) => m.RevenueByLocationBar),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> },
);

const WeeklyOccupancyChart = dynamic(
  () =>
    import("./charts/WeeklyOccupancyChart").then((m) => m.WeeklyOccupancyChart),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> },
);

const ServiceMixChart = dynamic(
  () => import("./charts/ServiceMixChart").then((m) => m.ServiceMixChart),
  { ssr: false, loading: () => <ChartSkeleton height={260} /> },
);

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="bg-muted/40 animate-pulse rounded-lg"
      style={{ height: `${height}px` }}
    />
  );
}

interface Props {
  locations: Location[];
  monthlyRevenueByLocation: {
    locationId: string;
    locationName: string;
    revenue: number;
  }[];
}

function flattenWeekly(
  rows: WeeklyOccupancyRow[],
  kind: "daycare" | "boarding",
) {
  return rows.map((row) => ({
    week: row.week,
    ...row[kind],
  }));
}

export function HQAnalyticsPanel({ locations, monthlyRevenueByLocation }: Props) {
  // Underperformer detection: > 1 standard deviation below mean revenue.
  const revenues = monthlyRevenueByLocation.map((r) => r.revenue);
  const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length;
  const sd =
    Math.sqrt(
      revenues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
        revenues.length,
    ) || 1;
  const underperformers = monthlyRevenueByLocation
    .filter((r) => r.revenue < mean - sd * 0.6)
    .map((r) => r.locationId);
  const topPerformerId =
    monthlyRevenueByLocation.reduce((top, r) =>
      r.revenue > top.revenue ? r : top,
    ).locationId;

  // Month-over-month delta on the network
  const trend = revenueTrend12Months as unknown as {
    month: string;
    [locationId: string]: number | string;
  }[];
  const totalsByMonth = trend.map((row) =>
    locations.reduce(
      (sum, l) => sum + (typeof row[l.id] === "number" ? (row[l.id] as number) : 0),
      0,
    ),
  );
  const lastMonthTotal = totalsByMonth[totalsByMonth.length - 1];
  const previousMonthTotal = totalsByMonth[totalsByMonth.length - 2] ?? lastMonthTotal;
  const monthlyDelta =
    previousMonthTotal === 0
      ? 0
      : ((lastMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;

  // Top service across the network
  const topService = serviceMix.reduce((top, s) =>
    s.total > top.total ? s : top,
  );
  const totalServiceRev = serviceMix.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6">
      {/* ── 12-month revenue trend ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">
                Revenue Trend · 12 Months
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                Each line is one location — spot seasonality and divergence
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 text-[11px]",
                  monthlyDelta >= 0
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20"
                    : "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-900/20",
                )}
              >
                {monthlyDelta >= 0 ? (
                  <TrendingUp className="size-3" />
                ) : (
                  <TrendingDown className="size-3" />
                )}
                {monthlyDelta >= 0 ? "+" : ""}
                {monthlyDelta.toFixed(1)}% MoM
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                ${(lastMonthTotal / 1000).toFixed(1)}k last month
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RevenueTrendLineChart data={trend} locations={locations} />
        </CardContent>
      </Card>

      {/* ── Revenue per location bar + service mix donut ───────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Revenue by Location · This Month
                </CardTitle>
                <p className="text-muted-foreground text-xs">
                  Side by side — who&apos;s leading, who&apos;s lagging
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {underperformers.map((id) => {
                  const loc = locations.find((l) => l.id === id);
                  if (!loc) return null;
                  return (
                    <Badge
                      key={id}
                      variant="outline"
                      className="gap-1 border-amber-300 bg-amber-50 text-[11px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                    >
                      <AlertTriangle className="size-3" />
                      {loc.shortCode} underperforming
                    </Badge>
                  );
                })}
                {topPerformerId && (
                  <Badge className="gap-1 bg-amber-500 text-[11px] text-white hover:bg-amber-500">
                    <Trophy className="size-3" />
                    {locations.find((l) => l.id === topPerformerId)?.shortCode}{" "}
                    leading
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueByLocationBar
              data={monthlyRevenueByLocation}
              locations={locations}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Service Mix
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              Revenue by service · all locations
            </p>
          </CardHeader>
          <CardContent>
            <ServiceMixChart data={serviceMix} />
            <div className="bg-muted/40 mt-2 rounded-md px-3 py-2 text-[11px]">
              <span className="text-muted-foreground">Top earner:</span>{" "}
              <strong>{topService.service}</strong> · $
              {topService.total.toLocaleString()} (
              {((topService.total / totalServiceRev) * 100).toFixed(0)}%)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Weekly occupancy split: daycare vs boarding ─────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sun className="size-4 text-amber-500" />
              <CardTitle className="text-base font-semibold">
                Daycare Occupancy · Last 4 Weeks
              </CardTitle>
            </div>
            <p className="text-muted-foreground text-xs">
              % of daily capacity used per location
            </p>
          </CardHeader>
          <CardContent>
            <WeeklyOccupancyChart
              data={flattenWeekly(weeklyOccupancy, "daycare")}
              locations={locations}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bed className="size-4 text-indigo-500" />
              <CardTitle className="text-base font-semibold">
                Boarding Occupancy · Last 4 Weeks
              </CardTitle>
            </div>
            <p className="text-muted-foreground text-xs">
              % of overnight capacity used per location
            </p>
          </CardHeader>
          <CardContent>
            <WeeklyOccupancyChart
              data={flattenWeekly(weeklyOccupancy, "boarding")}
              locations={locations.filter((l) => l.services.includes("boarding"))}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Service revenue per location stacked breakdown ──────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Service Revenue · By Location
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Which location drives each service line
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {serviceMix.map((row) => {
            const total = row.total || 1;
            return (
              <div key={row.service} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="size-2.5 rounded-sm"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.service}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    ${row.total.toLocaleString()}
                  </span>
                </div>
                <div className="bg-muted flex h-5 w-full overflow-hidden rounded-md">
                  {locations.map((loc) => {
                    const v = row.byLocation[loc.id] ?? 0;
                    if (v <= 0) return null;
                    const pct = (v / total) * 100;
                    return (
                      <div
                        key={loc.id}
                        title={`${loc.name}: $${v.toLocaleString()} (${pct.toFixed(0)}%)`}
                        className="h-full transition-all duration-200 hover:opacity-80"
                        style={{ width: `${pct}%`, backgroundColor: loc.color }}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                  {locations.map((loc) => {
                    const v = row.byLocation[loc.id] ?? 0;
                    if (v <= 0) return null;
                    return (
                      <span
                        key={loc.id}
                        className="text-muted-foreground inline-flex items-center gap-1"
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: loc.color }}
                        />
                        {loc.shortCode} ${(v / 1000).toFixed(1)}k
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

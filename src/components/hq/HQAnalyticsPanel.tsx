"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Trophy,
  ArrowLeftRight,
  ArrowRight,
} from "lucide-react";
import { getLocationsByFacility } from "@/data/locations";
import { useFacilityLocations } from "@/lib/api/locations";
import {
  useFacilityReport,
  useRevenueTrendByLocation,
  type RevenueByLocationData,
  type ServiceMixByLocationData,
} from "@/lib/api/facility-reports";
import { formatCurrency } from "@/lib/format";
import { HQStaffPerformanceReport } from "./reports/HQStaffPerformanceReport";
import { HQClientActivityReport } from "./reports/HQClientActivityReport";

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

const SERVICE_PALETTE: Record<string, string> = {
  boarding: "#6366f1",
  daycare: "#10b981",
  grooming: "#f59e0b",
  training: "#ec4899",
  vet: "#06b6d4",
  custom: "#8b5cf6",
};

function serviceColor(service: string): string {
  return SERVICE_PALETTE[service] ?? "#6b7280";
}

function serviceLabel(service: string): string {
  return service.charAt(0).toUpperCase() + service.slice(1);
}

const ALL = "all";

function thisMonthWindow(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

// ============================================================================
// HQ Analytics — real revenue trend, real revenue-by-location, real service
// mix. Staff performance and client activity stay fixture (fed the old
// `getLocationsByFacility(11)` locally, unrelated to the real `locations`
// used everywhere else on this page) -- neither has anywhere real to read
// from yet: `clients` carries no location column, and per-staff-per-location
// revenue/hours isn't derivable from anything that exists. Weekly occupancy
// and Transfer Impact are gone: occupancy has no real per-location source,
// and transfer history is now the real page this links to instead.
// ============================================================================

export function HQAnalyticsPanel() {
  const [selected, setSelected] = useState<string>(ALL);
  const isAll = selected === ALL;

  const { data: locations } = useFacilityLocations();
  const shownLocations = useMemo(
    () =>
      isAll
        ? (locations ?? [])
        : (locations ?? []).filter((l) => l.id === selected),
    [isAll, locations, selected],
  );

  const { from, to } = useMemo(() => thisMonthWindow(), []);
  const { data: revenueReport } = useFacilityReport(
    "revenue-by-location",
    from,
    to,
  );
  const { data: mixReport } = useFacilityReport(
    "service-mix-by-location",
    from,
    to,
  );
  const { data: trendRows } = useRevenueTrendByLocation(12);

  const revenue = (revenueReport?.data as RevenueByLocationData | undefined)
    ?.current;
  const mix = (mixReport?.data as ServiceMixByLocationData | undefined)
    ?.current;

  const shownRevenue = useMemo(
    () =>
      (revenue ?? [])
        .filter((r) => isAll || r.locationId === selected)
        .map((r) => ({
          locationId: r.locationId ?? "none",
          locationName: r.location,
          revenue: r.revenue,
        })),
    [revenue, isAll, selected],
  );

  // Underperformer / top-performer — network view only.
  const revenues = (revenue ?? []).map((r) => r.revenue);
  const mean = revenues.length
    ? revenues.reduce((a, b) => a + b, 0) / revenues.length
    : 0;
  const sd = revenues.length
    ? Math.sqrt(
        revenues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
          revenues.length,
      ) || 1
    : 1;
  const underperformers = isAll
    ? (revenue ?? []).filter((r) => r.revenue < mean - sd * 0.6)
    : [];
  const topPerformer =
    (revenue ?? []).length > 0
      ? (revenue ?? []).reduce((top, r) => (r.revenue > top.revenue ? r : top))
      : null;

  // Pivot the trend's tidy rows into { month, [locationId]: revenue }[].
  const trendData = useMemo(() => {
    const byMonth = new Map<string, Record<string, number | string>>();
    for (const row of trendRows ?? []) {
      const key = row.locationId ?? "none";
      const entry = byMonth.get(row.month) ?? { month: row.month };
      entry[key] = row.revenue;
      byMonth.set(row.month, entry);
    }
    return Array.from(byMonth.values()).sort((a, b) =>
      String(a.month).localeCompare(String(b.month)),
    ) as { month: string; [locationId: string]: number | string }[];
  }, [trendRows]);

  const totalsByMonth = trendData.map((row) =>
    shownLocations.reduce(
      (sum, l) =>
        sum + (typeof row[l.id] === "number" ? (row[l.id] as number) : 0),
      0,
    ),
  );
  const lastMonthTotal = totalsByMonth[totalsByMonth.length - 1] ?? 0;
  const previousMonthTotal =
    totalsByMonth[totalsByMonth.length - 2] ?? lastMonthTotal;
  const monthlyDelta =
    previousMonthTotal === 0
      ? 0
      : ((lastMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;

  // Service mix — network totals, or the selected location's slice.
  const scopedMixRows = useMemo(
    () => (mix ?? []).filter((r) => isAll || r.locationId === selected),
    [mix, isAll, selected],
  );
  const serviceMixSlices = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of scopedMixRows) {
      totals.set(row.service, (totals.get(row.service) ?? 0) + row.revenue);
    }
    return Array.from(totals.entries()).map(([service, total]) => ({
      service: serviceLabel(service),
      total,
      color: serviceColor(service),
    }));
  }, [scopedMixRows]);
  const topService = serviceMixSlices.length
    ? serviceMixSlices.reduce((top, s) => (s.total > top.total ? s : top))
    : null;
  const totalServiceRev = serviceMixSlices.reduce((sum, s) => sum + s.total, 0);

  // Service revenue per location, stacked — same source, grouped differently.
  const stackedByService = useMemo(() => {
    const byService = new Map<
      string,
      { service: string; total: number; byLocation: Map<string, number> }
    >();
    for (const row of mix ?? []) {
      const entry = byService.get(row.service) ?? {
        service: row.service,
        total: 0,
        byLocation: new Map<string, number>(),
      };
      entry.total += row.revenue;
      if (row.locationId) {
        entry.byLocation.set(
          row.locationId,
          (entry.byLocation.get(row.locationId) ?? 0) + row.revenue,
        );
      }
      byService.set(row.service, entry);
    }
    return Array.from(byService.values());
  }, [mix]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">
          Location:
        </span>
        <button
          onClick={() => setSelected(ALL)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            isAll
              ? "bg-foreground text-background border-transparent"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          All Locations
        </button>
        {(locations ?? []).map((loc) => {
          const active = selected === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => setSelected(loc.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                active
                  ? "bg-foreground text-background border-transparent"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: loc.color ?? "#475569" }}
              />
              {loc.name}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">
                Revenue Trend · 12 Months
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                {isAll
                  ? "Each line is one location — spot seasonality and divergence"
                  : "Selected location's monthly revenue"}
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
                {formatCurrency(lastMonthTotal)} last month
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RevenueTrendLineChart data={trendData} locations={shownLocations} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Revenue by Location · This Month
                </CardTitle>
                <p className="text-muted-foreground text-xs">
                  {isAll
                    ? "Side by side — who's leading, who's lagging"
                    : "Selected location"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {underperformers.map((r) => (
                  <Badge
                    key={r.locationId ?? r.location}
                    variant="outline"
                    className="gap-1 border-amber-300 bg-amber-50 text-[11px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                  >
                    <AlertTriangle className="size-3" />
                    {r.location} underperforming
                  </Badge>
                ))}
                {isAll && topPerformer && (
                  <Badge className="gap-1 bg-amber-500 text-[11px] text-white hover:bg-amber-500">
                    <Trophy className="size-3" />
                    {topPerformer.location} leading
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueByLocationBar
              data={shownRevenue}
              locations={shownLocations}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Service Mix
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              Revenue by service ·{" "}
              {isAll
                ? "all locations"
                : ((locations ?? []).find((l) => l.id === selected)?.name ??
                  "")}
            </p>
          </CardHeader>
          <CardContent>
            {serviceMixSlices.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No revenue this month yet.
              </p>
            ) : (
              <>
                <ServiceMixChart data={serviceMixSlices} />
                {topService && (
                  <div className="bg-muted/40 mt-2 rounded-md px-3 py-2 text-[11px]">
                    <span className="text-muted-foreground">Top earner:</span>{" "}
                    <strong>{topService.service}</strong> ·{" "}
                    {formatCurrency(topService.total)} (
                    {totalServiceRev > 0
                      ? ((topService.total / totalServiceRev) * 100).toFixed(0)
                      : 0}
                    %)
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Service Revenue · By Location
          </CardTitle>
          <p className="text-muted-foreground text-xs">
            Which location drives each service line, this month
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {stackedByService.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No revenue this month yet.
            </p>
          ) : (
            stackedByService.map((row) => {
              const total = row.total || 1;
              return (
                <div key={row.service} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium">
                      <span
                        className="size-2.5 rounded-sm"
                        style={{ backgroundColor: serviceColor(row.service) }}
                      />
                      {serviceLabel(row.service)}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatCurrency(row.total)}
                    </span>
                  </div>
                  <div className="bg-muted flex h-5 w-full overflow-hidden rounded-md">
                    {shownLocations.map((loc) => {
                      const v = row.byLocation.get(loc.id) ?? 0;
                      if (v <= 0) return null;
                      const pct = (v / total) * 100;
                      return (
                        <div
                          key={loc.id}
                          title={`${loc.name}: ${formatCurrency(v)} (${pct.toFixed(0)}%)`}
                          className="h-full transition-all duration-200 hover:opacity-80"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: loc.color ?? "#475569",
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <HQStaffPerformanceReport
        locations={getLocationsByFacility(11)}
        selectedLocation={selected}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <HQClientActivityReport
          locations={getLocationsByFacility(11)}
          selectedLocation={selected}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <ArrowLeftRight className="size-4" />
              Transfer History
            </CardTitle>
            <p className="text-muted-foreground text-xs">
              Every booking moved between branches, from the real audit trail
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/facility/hq/transfers">
                View transfer history
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

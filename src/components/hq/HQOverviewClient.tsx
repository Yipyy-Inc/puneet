"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CalendarDays,
  Users,
  Activity,
  ArrowRight,
  ArrowLeftRight,
  MapPin,
  BarChart3,
  Sparkles,
  RefreshCw,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { HQOverviewMetrics, Location } from "@/types/location";
import {
  locationStyles,
  styleFromKey,
  utilizationKey,
  type LocationColorClasses,
  type LocationColorKey,
} from "@/lib/hq/location-styles";
import { Sparkline } from "@/components/hq/charts/Sparkline";
import { MetricBar } from "@/components/hq/charts/MetricBar";
import { StackedDistribution } from "@/components/hq/charts/StackedDistribution";
import { HQAnalyticsPanel } from "@/components/hq/HQAnalyticsPanel";

interface Props {
  metrics: HQOverviewMetrics;
  locations: Location[];
}

function StatCard({
  label,
  value,
  sub,
  growth,
  icon: Icon,
  tone,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  growth?: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: LocationColorKey;
  trend?: number[];
}) {
  const positive = (growth ?? 0) >= 0;
  const s = styleFromKey(tone);
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-md">
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-br opacity-50 transition-opacity duration-300 group-hover:opacity-70",
          s.gradFrom,
          s.gradTo,
        )}
      />
      <CardContent className="relative pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              {label}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
          </div>
          <div className={cn("flex size-10 items-center justify-center rounded-xl", s.bgSoft)}>
            <Icon className={cn("size-5", s.text)} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {growth !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1 py-px text-[10px] font-semibold tabular-nums",
                positive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
              )}
            >
              {positive ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
              {positive ? "+" : ""}
              {growth.toFixed(1)}%
            </span>
          )}
          <span className="text-muted-foreground text-[10px]">vs last month</span>
          {trend && (
            <Sparkline
              values={trend}
              strokeClassName={s.stroke}
              fillClassName={cn(s.fill, "opacity-15")}
              className="ml-auto h-6 w-16"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LocationCard({
  loc,
  revenue,
  percentage,
  trend,
  s,
}: {
  loc: Location;
  revenue: number;
  percentage: number;
  trend: number[];
  s: LocationColorClasses;
}) {
  const m = loc.metrics;
  const utilS = m ? styleFromKey(utilizationKey(m.staffUtilization)) : styleFromKey("emerald");
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-md">
      <div className={cn("absolute inset-x-0 top-0 h-0.5", s.bg)} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-sm",
                s.bg,
              )}
            >
              {loc.shortCode}
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-sm font-semibold">{loc.name}</CardTitle>
              <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <MapPin className="size-3" />
                {loc.city}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
              s.borderSoft,
              s.text,
            )}
          >
            {loc.services.length} services
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Revenue share</span>
            <span className={cn("font-bold tabular-nums", s.text)}>{percentage.toFixed(1)}%</span>
          </div>
          <MetricBar percent={percentage} fillClassName={s.bg} size="sm" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className={cn("rounded-lg px-2.5 py-2", s.bgSofter)}>
            <p className="text-muted-foreground text-[10px]">Revenue</p>
            <p className="text-sm font-bold tabular-nums">${revenue.toLocaleString()}</p>
            {m && (
              <span
                className={cn(
                  "text-[10px] font-semibold tabular-nums",
                  m.revenueGrowth >= 0 ? "text-emerald-600" : "text-rose-500",
                )}
              >
                {m.revenueGrowth >= 0 ? "+" : ""}
                {m.revenueGrowth}%
              </span>
            )}
          </div>
          <div className={cn("rounded-lg px-2.5 py-2", s.bgSofter)}>
            <p className="text-muted-foreground text-[10px]">Bookings</p>
            <p className="text-sm font-bold tabular-nums">{m?.bookings ?? "--"}</p>
            {m && (
              <span
                className={cn(
                  "text-[10px] font-semibold tabular-nums",
                  m.bookingsGrowth >= 0 ? "text-emerald-600" : "text-rose-500",
                )}
              >
                {m.bookingsGrowth >= 0 ? "+" : ""}
                {m.bookingsGrowth}%
              </span>
            )}
          </div>
          <div className="bg-muted/40 rounded-lg px-2.5 py-2">
            <p className="text-muted-foreground text-[10px]">Occupancy</p>
            <p className="text-sm font-bold tabular-nums">{m?.occupancyRate ?? "--"}%</p>
            <p className="text-muted-foreground text-[10px]">avg rate</p>
          </div>
          <div className="bg-muted/40 rounded-lg px-2.5 py-2">
            <p className="text-muted-foreground text-[10px]">New clients</p>
            <p className="text-sm font-bold tabular-nums">{m?.newCustomers ?? "--"}</p>
            <p className="text-muted-foreground text-[10px]">this month</p>
          </div>
        </div>

        {m && (
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Staff utilization</span>
              <span className={cn("font-semibold", utilS.text)}>{m.staffUtilization}%</span>
            </div>
            <MetricBar percent={m.staffUtilization} fillClassName={utilS.bg} size="xs" />
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Revenue trend · Jan–Apr</span>
          </div>
          <Sparkline
            values={trend}
            strokeClassName={s.stroke}
            fillClassName={cn(s.fill, "opacity-15")}
            className="h-7 w-full"
            showDots
          />
        </div>

        <Link href="/facility/hq/comparison" className="block">
          <Button variant="ghost" size="sm" className="mt-1 h-7 w-full gap-1.5 text-xs">
            View details
            <ArrowRight className="size-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function HQOverviewClient({ metrics, locations }: Props) {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const totalRevenue = metrics.totalRevenue;
  const totalBookings = metrics.totalBookings;
  const totalCustomers = metrics.totalNewCustomers + metrics.totalReturningCustomers;
  const topLoc = locations.find((l) => l.id === metrics.topPerformingLocation);
  const topLocS = topLoc ? locationStyles(topLoc) : styleFromKey("sky");

  // Aggregated trend lines
  const totalRevTrend = metrics.revenueTrend.map((row) =>
    locations.reduce((sum, loc) => sum + ((row[loc.id] as number) ?? 0), 0),
  );

  return (
    <div className="flex-1 space-y-7 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-violet-500 shadow-md">
            <Sparkles className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">HQ Command Center</h1>
            <p className="text-muted-foreground text-sm">
              Network overview · {locations.length} locations · April 2026
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted/60 flex items-center gap-1 rounded-xl border p-1">
            {(["month", "quarter", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  period === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
          <Link href="/facility/hq/comparison">
            <Button size="sm" className="gap-1.5">
              <BarChart3 className="size-3.5" />
              Compare
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={`$${(totalRevenue / 1000).toFixed(1)}k`}
          sub={`${locations.length} locations · ${metrics.period}`}
          growth={metrics.revenueGrowth}
          icon={DollarSign}
          tone="sky"
          trend={totalRevTrend}
        />
        <StatCard
          label="Total Bookings"
          value={totalBookings.toLocaleString()}
          sub="confirmed + completed"
          growth={12.4}
          icon={CalendarDays}
          tone="violet"
        />
        <StatCard
          label="Active Clients"
          value={totalCustomers.toLocaleString()}
          sub={`${metrics.totalNewCustomers} new this month`}
          growth={8.9}
          icon={Users}
          tone="emerald"
        />
        <StatCard
          label="Avg Occupancy"
          value={`${metrics.avgOccupancyRate}%`}
          sub="across all locations"
          growth={5.2}
          icon={Activity}
          tone="amber"
        />
      </div>

      {/* Top performer hero + revenue split */}
      <div className="grid gap-4 lg:grid-cols-3">
        {topLoc && (
          <Card className={cn("relative overflow-hidden lg:col-span-2", topLocS.borderSoft)}>
            <div
              className={cn("absolute inset-0 bg-linear-to-br opacity-40", topLocS.gradFrom, topLocS.gradTo)}
            />
            <CardContent className="relative flex flex-wrap items-center gap-4 pt-5 pb-5">
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white shadow-md",
                  topLocS.bg,
                )}
              >
                {topLoc.shortCode}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <Crown className="size-4 text-amber-500" fill="currentColor" />
                  <span className="text-sm font-semibold">Top Performer This Month</span>
                </div>
                <p className="mt-0.5 text-base font-bold">{topLoc.name}</p>
                <p className="text-muted-foreground text-[11px]">
                  Leading on revenue, occupancy and bookings
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Stat
                  label="Revenue"
                  value={`$${topLoc.metrics?.revenue.toLocaleString() ?? "—"}`}
                  className={topLocS.text}
                />
                <Stat label="Occupancy" value={`${topLoc.metrics?.occupancyRate ?? "—"}%`} />
                <Stat label="Bookings" value={topLoc.metrics?.bookings.toLocaleString() ?? "—"} />
                <Link href="/facility/hq/comparison">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    Breakdown <ArrowRight className="size-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Revenue distribution</CardTitle>
            <p className="text-muted-foreground text-[11px]">By location · this month</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <StackedDistribution
              segments={metrics.revenueByLocation.map((r) => {
                const loc = locations.find((l) => l.id === r.locationId);
                const s = loc ? locationStyles(loc) : styleFromKey("sky");
                return {
                  key: r.locationId,
                  value: r.revenue,
                  className: s.bg,
                  label: `${r.locationName}: $${r.revenue.toLocaleString()}`,
                };
              })}
              size="md"
            />
            <ul className="space-y-1.5">
              {metrics.revenueByLocation.map((r) => {
                const loc = locations.find((l) => l.id === r.locationId);
                const s = loc ? locationStyles(loc) : styleFromKey("sky");
                return (
                  <li
                    key={r.locationId}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("size-2.5 rounded-sm", s.bg)} />
                      <span className="font-semibold">{r.locationName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground tabular-nums">
                        ${r.revenue.toLocaleString()}
                      </span>
                      <span className={cn("font-bold tabular-nums", s.text)}>
                        {r.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Location grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Locations</h2>
            <p className="text-muted-foreground text-xs">Live performance per branch</p>
          </div>
          <Link href="/facility/hq/settings">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              Manage settings <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {locations.map((loc) => {
            const rev = metrics.revenueByLocation.find((r) => r.locationId === loc.id);
            const trend = metrics.revenueTrend.map((row) => (row[loc.id] as number) ?? 0);
            const s = locationStyles(loc);
            return (
              <LocationCard
                key={loc.id}
                loc={loc}
                revenue={rev?.revenue ?? 0}
                percentage={rev?.percentage ?? 0}
                trend={trend}
                s={s}
              />
            );
          })}
        </div>
      </div>

      {/* Analytics panel — line chart, occupancy, service mix */}
      <HQAnalyticsPanel
        locations={locations}
        monthlyRevenueByLocation={metrics.revenueByLocation.map((r) => ({
          locationId: r.locationId,
          locationName: r.locationName,
          revenue: r.revenue,
        }))}
      />

      {/* Revenue trend table */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Monthly Breakdown</h2>
          <span className="text-muted-foreground text-xs">Jan–Apr 2026</span>
        </div>
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground pb-2 text-left text-[11px] font-semibold tracking-wider uppercase">
                      Month
                    </th>
                    {locations.map((loc) => {
                      const s = locationStyles(loc);
                      return (
                        <th
                          key={loc.id}
                          className={cn(
                            "pb-2 text-right text-[11px] font-semibold tracking-wider uppercase",
                            s.text,
                          )}
                        >
                          {loc.shortCode}
                        </th>
                      );
                    })}
                    <th className="pb-2 text-right text-[11px] font-semibold tracking-wider uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {metrics.revenueTrend.map((row) => {
                    const rowTotal = locations.reduce(
                      (sum, loc) => sum + ((row[loc.id] as number) ?? 0),
                      0,
                    );
                    return (
                      <tr key={row.date} className="hover:bg-muted/30 group transition-colors">
                        <td className="py-2.5 text-xs font-medium">{row.date}</td>
                        {locations.map((loc) => (
                          <td
                            key={loc.id}
                            className="py-2.5 text-right text-xs tabular-nums"
                          >
                            ${((row[loc.id] as number) ?? 0).toLocaleString()}
                          </td>
                        ))}
                        <td className="py-2.5 text-right text-xs font-semibold tabular-nums">
                          ${rowTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td className="pt-2.5 text-xs font-semibold">Total</td>
                    {locations.map((loc) => {
                      const locTotal = metrics.revenueTrend.reduce(
                        (sum, row) => sum + ((row[loc.id] as number) ?? 0),
                        0,
                      );
                      const s = locationStyles(loc);
                      return (
                        <td
                          key={loc.id}
                          className={cn(
                            "pt-2.5 text-right text-xs font-semibold tabular-nums",
                            s.text,
                          )}
                        >
                          ${locTotal.toLocaleString()}
                        </td>
                      );
                    })}
                    <td className="pt-2.5 text-right text-xs font-bold tabular-nums">
                      ${metrics.revenueTrend
                        .reduce(
                          (sum, row) =>
                            sum +
                            locations.reduce(
                              (s, loc) => s + ((row[loc.id] as number) ?? 0),
                              0,
                            ),
                          0,
                        )
                        .toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            href: "/facility/hq/comparison",
            icon: BarChart3,
            label: "Location Comparison",
            sub: "Side-by-side metrics",
            tone: "sky" as LocationColorKey,
          },
          {
            href: "/facility/hq/reports",
            icon: BarChart3,
            label: "Cross-Location Reports",
            sub: "Client activity, staff perf, transfers",
            tone: "rose" as LocationColorKey,
          },
          {
            href: "/facility/hq/services",
            icon: Activity,
            label: "Service Catalog",
            sub: "Master services + location overrides",
            tone: "sky" as LocationColorKey,
          },
          {
            href: "/facility/hq/staff",
            icon: Users,
            label: "Staff Pool",
            sub: "Shared staff management",
            tone: "violet" as LocationColorKey,
          },
          {
            href: "/facility/hq/transfers",
            icon: ArrowLeftRight,
            label: "Transfer History",
            sub: "Booking moves log",
            tone: "emerald" as LocationColorKey,
          },
          {
            href: "/facility/hq/settings",
            icon: Activity,
            label: "HQ Settings",
            sub: "Multi-location controls",
            tone: "amber" as LocationColorKey,
          },
        ].map((link) => {
          const s = styleFromKey(link.tone);
          return (
            <Link key={link.href} href={link.href}>
              <Card className="group relative cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md">
                <div className={cn("absolute inset-0 bg-linear-to-br opacity-40 transition-opacity duration-300 group-hover:opacity-70", s.gradFrom, s.gradTo)} />
                <CardContent className="relative flex items-center gap-3 pt-4 pb-4">
                  <div className={cn("flex size-9 items-center justify-center rounded-xl", s.bgSoft)}>
                    <link.icon className={cn("size-4.5", s.text)} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{link.label}</p>
                    <p className="text-muted-foreground text-xs">{link.sub}</p>
                  </div>
                  <ArrowRight className="text-muted-foreground ml-auto size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Separator />
      <p className="text-muted-foreground text-center text-xs">
        Data reflects April 2026 · Auto-refreshes every 5 minutes
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="text-center">
      <p className={cn("text-base font-bold tabular-nums", className)}>{value}</p>
      <p className="text-muted-foreground text-[10px]">{label}</p>
    </div>
  );
}


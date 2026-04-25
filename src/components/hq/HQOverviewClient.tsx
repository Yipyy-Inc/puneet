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
  Star,
  ArrowRight,
  ArrowLeftRight,
  MapPin,
  BarChart3,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { HQOverviewMetrics } from "@/types/location";
import type { Location } from "@/types/location";

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
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  growth?: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
}) {
  const positive = (growth ?? 0) >= 0;
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-md">
      <div
        className="absolute inset-0 opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.07]"
        style={{ background: `radial-gradient(ellipse at top left, ${accent}, transparent 70%)` }}
      />
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {label}
            </p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && (
              <p className="text-muted-foreground text-xs">{sub}</p>
            )}
          </div>
          <div
            className="flex size-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accent}18` }}
          >
            <Icon className="size-5" style={{ color: accent }} />
          </div>
        </div>
        {growth !== undefined && (
          <div className="mt-3 flex items-center gap-1.5">
            {positive ? (
              <TrendingUp className="size-3.5 text-emerald-500" />
            ) : (
              <TrendingDown className="size-3.5 text-red-500" />
            )}
            <span
              className={cn(
                "text-xs font-semibold",
                positive ? "text-emerald-600" : "text-red-600",
              )}
            >
              {positive ? "+" : ""}
              {growth.toFixed(1)}%
            </span>
            <span className="text-muted-foreground text-xs">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LocationCard({
  loc,
  revenue,
  percentage,
}: {
  loc: Location;
  revenue: number;
  percentage: number;
}) {
  const m = loc.metrics;
  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-8 items-center justify-center rounded-lg text-[11px] font-bold text-white"
              style={{ backgroundColor: loc.color }}
            >
              {loc.shortCode}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{loc.name}</CardTitle>
              <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                <MapPin className="size-3" />
                {loc.city}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="text-[10px]"
            style={{
              backgroundColor: `${loc.color}18`,
              color: loc.color,
              border: `1px solid ${loc.color}30`,
            }}
          >
            {loc.services.length} services
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Revenue bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">Revenue share</span>
            <span className="text-xs font-semibold">{percentage.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${percentage}%`, backgroundColor: loc.color }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
            <p className="text-muted-foreground text-[10px]">Revenue</p>
            <p className="text-sm font-bold">${revenue.toLocaleString()}</p>
            {m && (
              <p className={cn("text-[10px] font-medium", m.revenueGrowth >= 0 ? "text-emerald-600" : "text-red-500")}>
                {m.revenueGrowth >= 0 ? "+" : ""}{m.revenueGrowth}%
              </p>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
            <p className="text-muted-foreground text-[10px]">Occupancy</p>
            <p className="text-sm font-bold">{m?.occupancyRate ?? "--"}%</p>
            <p className="text-muted-foreground text-[10px]">avg rate</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
            <p className="text-muted-foreground text-[10px]">Bookings</p>
            <p className="text-sm font-bold">{m?.bookings ?? "--"}</p>
            {m && (
              <p className={cn("text-[10px] font-medium", m.bookingsGrowth >= 0 ? "text-emerald-600" : "text-red-500")}>
                {m.bookingsGrowth >= 0 ? "+" : ""}{m.bookingsGrowth}%
              </p>
            )}
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900/50">
            <p className="text-muted-foreground text-[10px]">New Clients</p>
            <p className="text-sm font-bold">{m?.newCustomers ?? "--"}</p>
            <p className="text-muted-foreground text-[10px]">this month</p>
          </div>
        </div>

        {/* Staff utilization */}
        {m && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-muted-foreground text-[10px]">Staff utilization</span>
              <span className="text-[10px] font-semibold">{m.staffUtilization}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${m.staffUtilization}%`,
                  backgroundColor: m.staffUtilization >= 85 ? "#22c55e" : m.staffUtilization >= 70 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
          </div>
        )}

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

  return (
    <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10">
              <Sparkles className="size-4.5 text-sky-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">HQ Overview</h1>
              <p className="text-muted-foreground text-sm">All locations · April 2026</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Period switcher */}
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

      {/* ── KPI Strip ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={`$${(totalRevenue / 1000).toFixed(1)}k`}
          sub={`${locations.length} locations`}
          growth={metrics.revenueGrowth}
          icon={DollarSign}
          accent="#0ea5e9"
        />
        <StatCard
          label="Total Bookings"
          value={totalBookings.toLocaleString()}
          sub="confirmed + completed"
          growth={12.4}
          icon={CalendarDays}
          accent="#8b5cf6"
        />
        <StatCard
          label="Active Clients"
          value={totalCustomers.toLocaleString()}
          sub={`${metrics.totalNewCustomers} new this month`}
          growth={8.9}
          icon={Users}
          accent="#22c55e"
        />
        <StatCard
          label="Avg Occupancy"
          value={`${metrics.avgOccupancyRate}%`}
          sub="across all locations"
          growth={5.2}
          icon={Activity}
          accent="#fb923c"
        />
      </div>

      {/* ── Top Performer Banner ── */}
      {topLoc && (
        <div
          className="flex items-center gap-4 rounded-2xl border p-4"
          style={{ borderColor: `${topLoc.color}40`, backgroundColor: `${topLoc.color}08` }}
        >
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: topLoc.color }}
          >
            {topLoc.shortCode}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Star className="size-4 text-amber-500" fill="currentColor" />
              <span className="text-sm font-semibold">Top Performer This Month</span>
            </div>
            <p className="text-muted-foreground text-xs">
              {topLoc.name} leads with{" "}
              <strong>${topLoc.metrics?.revenue.toLocaleString()}</strong> revenue,{" "}
              <strong>{topLoc.metrics?.occupancyRate}%</strong> occupancy and{" "}
              <strong>{topLoc.metrics?.bookings}</strong> bookings.
            </p>
          </div>
          <Link href="/facility/hq/comparison">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              View breakdown <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>
      )}

      {/* ── Location Cards Grid ── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Locations</h2>
          <Link href="/facility/hq/settings">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              Manage settings <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {locations.map((loc) => {
            const rev = metrics.revenueByLocation.find((r) => r.locationId === loc.id);
            return (
              <LocationCard
                key={loc.id}
                loc={loc}
                revenue={rev?.revenue ?? 0}
                percentage={rev?.percentage ?? 0}
              />
            );
          })}
        </div>
      </div>

      {/* ── Revenue Table ── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Revenue Trend</h2>
          <span className="text-muted-foreground text-xs">Jan–Apr 2026</span>
        </div>
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-muted-foreground pb-2 text-left text-xs font-medium">Month</th>
                    {locations.map((loc) => (
                      <th key={loc.id} className="pb-2 text-right text-xs font-medium" style={{ color: loc.color }}>
                        {loc.shortCode}
                      </th>
                    ))}
                    <th className="pb-2 text-right text-xs font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {metrics.revenueTrend.map((row) => {
                    const rowTotal = locations.reduce(
                      (sum, loc) => sum + ((row[loc.id] as number) ?? 0),
                      0,
                    );
                    return (
                      <tr key={row.date} className="group hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 text-xs font-medium">{row.date}</td>
                        {locations.map((loc) => (
                          <td key={loc.id} className="py-2.5 text-right font-[tabular-nums] text-xs">
                            ${((row[loc.id] as number) ?? 0).toLocaleString()}
                          </td>
                        ))}
                        <td className="py-2.5 text-right font-[tabular-nums] text-xs font-semibold">
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
                      return (
                        <td key={loc.id} className="pt-2.5 text-right font-[tabular-nums] text-xs font-semibold" style={{ color: loc.color }}>
                          ${locTotal.toLocaleString()}
                        </td>
                      );
                    })}
                    <td className="pt-2.5 text-right font-[tabular-nums] text-xs font-bold">
                      ${metrics.revenueTrend.reduce((sum, row) => {
                        return sum + locations.reduce((s, loc) => s + ((row[loc.id] as number) ?? 0), 0);
                      }, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Quick Links ── */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/facility/hq/comparison", icon: BarChart3, label: "Location Comparison", sub: "Side-by-side metrics" },
          { href: "/facility/hq/staff", icon: Users, label: "Staff Pool", sub: "Shared staff management" },
          { href: "/facility/hq/transfers", icon: ArrowLeftRight, label: "Transfer History", sub: "Booking moves log" },
          { href: "/facility/hq/settings", icon: Activity, label: "HQ Settings", sub: "Multi-location controls" },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="group cursor-pointer transition-all duration-200 hover:shadow-md">
              <CardContent className="flex items-center gap-3 pt-4 pb-4">
                <div className="bg-primary/10 flex size-9 items-center justify-center rounded-xl">
                  <link.icon className="text-primary size-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{link.label}</p>
                  <p className="text-muted-foreground text-xs">{link.sub}</p>
                </div>
                <ArrowRight className="text-muted-foreground ml-auto size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Separator />
      <p className="text-muted-foreground text-center text-xs">
        Data reflects April 2026 · Auto-refreshes every 5 minutes
      </p>
    </div>
  );
}

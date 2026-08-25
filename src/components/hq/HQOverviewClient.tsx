"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Activity,
  ArrowRight,
  ArrowLeftRight,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  locationStyles,
  styleFromKey,
  type LocationColorKey,
} from "@/lib/hq/location-styles";
import { StackedDistribution } from "@/components/hq/charts/StackedDistribution";
import { NetworkStatusBar } from "@/components/hq/command-center/NetworkStatusBar";
import { CommandCenterKpis } from "@/components/hq/command-center/CommandCenterKpis";
import { LocationCard } from "@/components/hq/command-center/LocationCard";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useFacilityLocations } from "@/lib/api/locations";
import { useStaffHomeLocations } from "@/lib/api/staff";
import {
  useFacilityReport,
  type RevenueByLocationData,
} from "@/lib/api/facility-reports";

// ============================================================================
// HQ Command Center — real branches, real revenue, real headcount.
//
// The Network Activity Feed is gone, not converted: there is no real
// activity-stream table, and `hqActivityFeed` was a hand-authored event log
// anchored to a fixed month. Everything else here now reads either
// `useFacilityLocations()` or the same `facility_report_dataset` RPC the
// Reports page uses, via `useFacilityReport`.
// ============================================================================

function thisMonthWindow(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function HQOverviewClient() {
  const canSeeRevenue = usePermission("financial_view_revenue");
  const { data: locations, isPending: locationsPending } =
    useFacilityLocations();
  const { data: staff } = useStaffHomeLocations();

  const { from, to } = useMemo(() => thisMonthWindow(), []);
  const { data: revenueReport } = useFacilityReport(
    "revenue-by-location",
    from,
    to,
  );
  const revenue = (revenueReport?.data as RevenueByLocationData | undefined)
    ?.current;
  const revenueTotal = (revenue ?? []).reduce((s, r) => s + r.revenue, 0);

  if (locationsPending) {
    return (
      <div className="space-y-6 p-4 pt-6 md:p-8">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-7 p-4 pt-6 md:p-8">
      <NetworkStatusBar />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-violet-500 shadow-md">
            <Sparkles className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              HQ Command Center
            </h1>
            <p className="text-muted-foreground text-sm">
              Network overview · {(locations ?? []).length} locations
            </p>
          </div>
        </div>
      </div>

      <CommandCenterKpis />

      {canSeeRevenue && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Revenue distribution
              </CardTitle>
              <p className="text-muted-foreground text-[11px]">
                By location · this month
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {!revenue || revenue.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No revenue this month yet.
                </p>
              ) : (
                <>
                  <StackedDistribution
                    segments={revenue.map((r) => {
                      const loc = (locations ?? []).find(
                        (l) => l.id === r.locationId,
                      );
                      const s = loc ? locationStyles(loc) : styleFromKey("sky");
                      return {
                        key: r.locationId ?? r.location,
                        value: r.revenue,
                        className: s.bg,
                        label: `${r.location}: $${r.revenue.toLocaleString()}`,
                      };
                    })}
                    size="md"
                  />
                  <ul className="space-y-1.5">
                    {revenue.map((r) => {
                      const loc = (locations ?? []).find(
                        (l) => l.id === r.locationId,
                      );
                      const s = loc ? locationStyles(loc) : styleFromKey("sky");
                      const pct =
                        revenueTotal > 0 ? (r.revenue / revenueTotal) * 100 : 0;
                      return (
                        <li
                          key={r.locationId ?? r.location}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="flex items-center gap-2">
                            <span className={cn("size-2.5 rounded-sm", s.bg)} />
                            <span className="font-semibold">{r.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground tabular-nums">
                              ${r.revenue.toLocaleString()}
                            </span>
                            <span
                              className={cn("font-bold tabular-nums", s.text)}
                            >
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Locations</h2>
            <p className="text-muted-foreground text-xs">
              This month&apos;s revenue and bookings per branch
            </p>
          </div>
          <Link href="/facility/hq/settings">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              Manage settings <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(locations ?? []).map((loc) => {
            const row = revenue?.find((r) => r.locationId === loc.id);
            return (
              <LocationCard
                key={loc.id}
                location={loc}
                staff={staff ?? []}
                revenue={row?.revenue}
                bookings={row?.bookings}
              />
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            href: "/facility/hq/reports",
            icon: BarChart3,
            label: "HQ Analytics",
            sub: "Consolidated & per-location charts",
            tone: "sky" as LocationColorKey,
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
            sub: "Roster by home branch",
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
                <div
                  className={cn(
                    "absolute inset-0 bg-linear-to-br opacity-40 transition-opacity duration-300 group-hover:opacity-70",
                    s.gradFrom,
                    s.gradTo,
                  )}
                />
                <CardContent className="relative flex items-center gap-3 pt-4 pb-4">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl",
                      s.bgSoft,
                    )}
                  >
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
        Figures are real, read live from bookings and payments.
      </p>
    </div>
  );
}

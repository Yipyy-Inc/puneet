"use client";

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
import type { HQOverviewMetrics, Location } from "@/types/location";
import {
  locationStyles,
  styleFromKey,
  type LocationColorKey,
} from "@/lib/hq/location-styles";
import { StackedDistribution } from "@/components/hq/charts/StackedDistribution";
import { NetworkStatusBar } from "@/components/hq/command-center/NetworkStatusBar";
import { CommandCenterKpis } from "@/components/hq/command-center/CommandCenterKpis";
import { LocationCard } from "@/components/hq/command-center/LocationCard";
import { NetworkActivityFeed } from "@/components/hq/command-center/NetworkActivityFeed";
import { LastUpdated } from "@/components/hq/LastUpdated";

interface Props {
  metrics: HQOverviewMetrics;
  locations: Location[];
}

export function HQOverviewClient({ metrics, locations }: Props) {
  return (
    <div className="flex-1 space-y-7 p-4 pt-6 md:p-8">
      {/* Network status bar — live per-location status at the very top */}
      <NetworkStatusBar locations={locations} />

      {/* Header */}
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
              Network overview · {locations.length} locations · April 2026
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LastUpdated label="Last updated" />
          <Link href="/facility/hq/comparison">
            <Button size="sm" className="gap-1.5">
              <BarChart3 className="size-3.5" />
              Compare
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI tiles + date-range selector */}
      <CommandCenterKpis locations={locations} />

      {/* Revenue distribution */}
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
            <p className="text-muted-foreground text-xs">
              Live performance per branch
            </p>
          </div>
          <Link href="/facility/hq/settings">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              Manage settings <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {locations.map((loc) => (
            <LocationCard key={loc.id} location={loc} />
          ))}
        </div>
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

      {/* Network activity feed */}
      <NetworkActivityFeed />

      <Separator />
      <p className="text-muted-foreground text-center text-xs">
        Data reflects April 2026 · Auto-refreshes every 5 minutes
      </p>
    </div>
  );
}

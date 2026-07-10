"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Location } from "@/types/location";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MetricBar } from "@/components/hq/charts/MetricBar";
import { locationStyles } from "@/lib/hq/location-styles";
import {
  deriveOpenState,
  OPEN_STATE_META,
  liveCount,
} from "@/lib/hq/location-status";
import {
  getUpcomingBookings,
  getLocationAlerts,
  formatAlertBanner,
} from "@/lib/hq/command-center-cards";
import { useLocationContext } from "@/hooks/use-location-context";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Format "2026-04-01" → "Apr 1" without reading the clock (lint-safe).
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d ?? 1}`;
}

function prettyRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const SERVICE_LABEL: Record<string, string> = {
  boarding: "Boarding",
  daycare: "Daycare",
  grooming: "Grooming",
  training: "Training",
};

interface Props {
  location: Location;
}

/**
 * Operational location card for the HQ Command Center grid. Shows live status,
 * today's occupancy, revenue (today vs. month), staff on site, the next few
 * bookings, and an alerts banner — all in the professional location palette.
 */
export function LocationCard({ location }: Props) {
  const router = useRouter();
  const { setLocation } = useLocationContext();
  // Snapshot "now" once at mount (avoids reading the clock during render).
  const [now] = useState(() => new Date());

  const s = locationStyles(location);
  const state = deriveOpenState(location.hours, now);
  const stateMeta = OPEN_STATE_META[state];

  const occupancyRate = location.metrics?.occupancyRate ?? 0;
  const boarding = liveCount(location.capacity.boarding, occupancyRate);
  const daycare = liveCount(location.capacity.daycare, occupancyRate);
  const occupancyRows = [
    { key: "boarding", count: boarding, cap: location.capacity.boarding },
    { key: "daycare", count: daycare, cap: location.capacity.daycare },
  ].filter((r) => r.count !== null);

  const monthRevenue = location.metrics?.revenue ?? 0;
  const todayRevenue = Math.round(monthRevenue / 30);

  const staff = location.staffAssignments;
  const upcoming = getUpcomingBookings(location.id, 3);
  const alerts = getLocationAlerts(location.id);

  function openDashboard() {
    setLocation(location.id);
    router.push("/facility/dashboard");
  }

  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-xl border">
      <div className={cn("h-0.5", s.bg)} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Name + status badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white",
                s.bg,
              )}
            >
              {location.shortCode}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{location.name}</p>
              <p className="text-muted-foreground truncate text-[11px]">
                {location.city}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
              stateMeta.className,
            )}
          >
            {stateMeta.label}
          </span>
        </div>

        {/* Today's occupancy — compact progress bars */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            Today&apos;s occupancy
          </p>
          {occupancyRows.length === 0 ? (
            <p className="text-muted-foreground text-[11px] italic">
              No occupancy tracked
            </p>
          ) : (
            occupancyRows.map((r) => (
              <div key={r.key}>
                <div className="mb-0.5 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {SERVICE_LABEL[r.key]}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {r.count}/{r.cap}
                  </span>
                </div>
                <MetricBar
                  percent={occupancyRate}
                  fillClassName={s.bg}
                  size="xs"
                />
              </div>
            ))
          )}
        </div>

        {/* Revenue today vs. this month */}
        <div className="grid grid-cols-2 gap-2">
          <div className={cn("rounded-lg px-2.5 py-1.5", s.bgSofter)}>
            <p className="text-muted-foreground text-[10px]">Revenue today</p>
            <p className="text-sm font-bold tabular-nums">
              ${todayRevenue.toLocaleString()}
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg px-2.5 py-1.5">
            <p className="text-muted-foreground text-[10px]">This month</p>
            <p className="text-sm font-bold tabular-nums">
              ${monthRevenue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Staff in — click to see who */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="hover:bg-muted/50 flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium transition-colors"
            >
              <Users className={cn("size-3.5", s.text)} />
              {staff.length} staff in
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <p className="text-muted-foreground mb-1.5 px-1 text-[10px] font-semibold tracking-wider uppercase">
              On site · {location.shortCode}
            </p>
            <ul className="space-y-0.5">
              {staff.map((m) => (
                <li
                  key={m.staffId}
                  className="flex items-center justify-between gap-2 rounded-md px-1 py-1 text-xs"
                >
                  <span className="truncate font-medium">{m.staffName}</span>
                  <span className="text-muted-foreground shrink-0 text-[10px]">
                    {prettyRole(m.role)}
                  </span>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        {/* Next upcoming bookings — mini chips */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
            Next up
          </p>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-[11px] italic">
              No upcoming bookings
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {upcoming.map((b) => (
                <span
                  key={b.id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                    s.borderSoft,
                  )}
                >
                  <span className="truncate">{b.petName}</span>
                  <span className="text-muted-foreground">
                    · {SERVICE_LABEL[b.service] ?? b.service} ·{" "}
                    {shortDate(b.startDate)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* View Location */}
        <Button
          variant="outline"
          size="sm"
          onClick={openDashboard}
          className="mt-auto w-full gap-1.5 text-xs"
        >
          View Location
          <ArrowRight className="size-3.5" />
        </Button>
      </div>

      {/* Active-alerts banner */}
      {alerts.total > 0 && (
        <div className="flex items-center gap-1.5 bg-red-500/10 px-4 py-2 text-[11px] font-medium text-red-700 dark:text-red-400">
          <AlertTriangle className="size-3.5 shrink-0" />
          {formatAlertBanner(alerts)}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import type { Location } from "@/types/location";
import { locationStyles } from "@/lib/hq/location-styles";
import {
  deriveOpenState,
  OPEN_STATE_META,
  liveCount,
} from "@/lib/hq/location-status";
import { useLocationContext } from "@/hooks/use-location-context";
import { deriveLocationId } from "@/data/locations";
import { incidents } from "@/data/incidents";

// Locations with an unresolved incident right now → red alert dot.
const ALERT_LOCATION_IDS = new Set(
  incidents
    .filter((i) => i.status === "open" || i.status === "investigating")
    .map((i) => deriveLocationId(i.id)),
);

interface Props {
  locations: Location[];
}

/**
 * Network Status Bar — a single horizontal row of compact, at-a-glance status
 * chips (one per location) at the very top of the HQ Command Center. Pure live
 * status: open/closed, occupancy as raw numbers, staff in, today's revenue, and
 * an alert dot. Clicking a chip switches location context and opens that
 * location's individual dashboard. No charts.
 */
export function NetworkStatusBar({ locations }: Props) {
  const router = useRouter();
  const { setLocation } = useLocationContext();
  // Snapshot "now" once at mount (avoids reading the clock during render).
  const [now] = useState(() => new Date());

  function openLocation(id: string) {
    setLocation(id);
    router.push("/facility/dashboard");
  }

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {locations.map((loc) => {
        const s = locationStyles(loc);
        const state = deriveOpenState(loc.hours, now);
        const meta = OPEN_STATE_META[state];
        const occupancyRate = loc.metrics?.occupancyRate ?? 0;
        const boarding = liveCount(loc.capacity.boarding, occupancyRate);
        const daycare = liveCount(loc.capacity.daycare, occupancyRate);
        const staffIn = loc.staffAssignments.length;
        const todayRevenue = Math.round((loc.metrics?.revenue ?? 0) / 30);
        const hasAlert = ALERT_LOCATION_IDS.has(loc.id);

        return (
          <button
            key={loc.id}
            type="button"
            onClick={() => openLocation(loc.id)}
            aria-label={`Open ${loc.name} dashboard`}
            className="bg-card hover:border-primary/40 group flex min-w-60 shrink-0 flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors hover:shadow-sm"
          >
            {/* Name + open state + alert */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white",
                    s.bg,
                  )}
                >
                  {loc.shortCode}
                </span>
                <span className="truncate text-xs font-semibold">
                  {loc.name}
                </span>
              </div>
              {hasAlert && (
                <span
                  role="status"
                  aria-label="Active alert"
                  title="Active alert at this location"
                  className="size-2.5 shrink-0 rounded-full bg-red-500 ring-2 ring-red-500/20"
                />
              )}
            </div>

            <span
              className={cn(
                "inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                meta.className,
              )}
            >
              {meta.label}
            </span>

            {/* Occupancy as raw numbers (not percentages) */}
            <p className="text-muted-foreground text-[11px] tabular-nums">
              {boarding === null && daycare === null ? (
                <span className="italic">No occupancy tracked</span>
              ) : (
                <>
                  {boarding !== null && (
                    <span className="text-foreground font-medium">
                      {boarding}/{loc.capacity.boarding}{" "}
                      <span className="text-muted-foreground font-normal">
                        boarding
                      </span>
                    </span>
                  )}
                  {boarding !== null && daycare !== null && (
                    <span className="px-1">·</span>
                  )}
                  {daycare !== null && (
                    <span className="text-foreground font-medium">
                      {daycare}/{loc.capacity.daycare}{" "}
                      <span className="text-muted-foreground font-normal">
                        daycare
                      </span>
                    </span>
                  )}
                </>
              )}
            </p>

            {/* Staff in + today's revenue */}
            <div className="text-muted-foreground flex items-center justify-between text-[11px]">
              <span className="tabular-nums">
                <span className="text-foreground font-medium">{staffIn}</span>{" "}
                staff in
              </span>
              <span className="tabular-nums">
                <span className="text-foreground font-semibold">
                  ${todayRevenue.toLocaleString()}
                </span>{" "}
                today
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

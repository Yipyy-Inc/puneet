"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { Location } from "@/types/location";
import { HqKpiTile } from "@/components/hq/HqKpiTile";
import { liveCount } from "@/lib/hq/location-status";
import {
  getLocationAlerts,
  formatAlertBanner,
} from "@/lib/hq/command-center-cards";

interface Props {
  location: Location;
}

export function OverviewTab({ location }: Props) {
  const m = location.metrics;
  const occ = m?.occupancyRate ?? 0;
  const boarding = liveCount(location.capacity.boarding, occ);
  const daycare = liveCount(location.capacity.daycare, occ);
  const monthRevenue = m?.revenue ?? 0;
  const todayRevenue = Math.round(monthRevenue / 30);
  const todayBookings = Math.round((m?.bookings ?? 0) / 30);
  const staffOnDuty = location.staffAssignments.length;

  const occupancySub = [
    boarding !== null
      ? `Boarding ${boarding}/${location.capacity.boarding}`
      : null,
    daycare !== null ? `Daycare ${daycare}/${location.capacity.daycare}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const alerts = getLocationAlerts(location.id);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <HqKpiTile
          label="This Month Revenue"
          value={`$${monthRevenue.toLocaleString()}`}
          delta={m?.revenueGrowth}
          sublabel="vs. last month"
        />
        <HqKpiTile
          label="Today's Revenue (est.)"
          value={`$${todayRevenue.toLocaleString()}`}
          sublabel="month ÷ 30"
        />
        <HqKpiTile
          label="Today's Bookings (est.)"
          value={todayBookings}
          sublabel="month ÷ 30"
        />
        <HqKpiTile
          label="Current Occupancy"
          value={occ}
          unit="%"
          sublabel={occupancySub || "No occupancy tracked"}
        />
        <HqKpiTile
          label="Staff on Duty"
          value={staffOnDuty}
          sublabel="assigned to this location"
        />
      </div>

      {/* Active alerts */}
      <div className="rounded-xl border p-4">
        <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
          Active alerts
        </p>
        {alerts.total === 0 ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4" />
            No active alerts at this location.
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
            <AlertTriangle className="size-4 shrink-0" />
            {formatAlertBanner(alerts)}
          </p>
        )}
      </div>
    </div>
  );
}

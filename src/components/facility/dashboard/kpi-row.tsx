"use client";

import { LogIn, LogOut, PawPrint, Home } from "lucide-react";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { useUnifiedBookings } from "@/hooks/use-unified-bookings";
import { useDashboardFilters } from "@/components/facility/dashboard/dashboard-filters-context";

export function KpiRow() {
  const { counts } = useUnifiedBookings();
  const { tab, setTab } = useDashboardFilters();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiTile
        label="Current Guests"
        value={counts.currentGuests}
        hint="Pets currently on-site"
        icon={PawPrint}
        tone="indigo"
        active={tab === "checked-in"}
        onClick={() => setTab("checked-in")}
      />
      <KpiTile
        label="Today's Arrivals"
        value={counts.todaysArrivals}
        hint="Scheduled check-ins"
        icon={LogIn}
        tone="amber"
        active={tab === "scheduled"}
        onClick={() => setTab("scheduled")}
      />
      <KpiTile
        label="Going Home Today"
        value={counts.goingHomeToday}
        hint="Departures expected"
        icon={Home}
        tone="violet"
        active={tab === "going-home"}
        onClick={() => setTab("going-home")}
      />
      <KpiTile
        label="Checked Out"
        value={counts.checkedOutToday}
        hint="Already departed today"
        icon={LogOut}
        tone="emerald"
        active={tab === "checked-out"}
        onClick={() => setTab("checked-out")}
      />
    </div>
  );
}

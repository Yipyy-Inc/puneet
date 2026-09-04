"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { LogIn, LogOut, PawPrint, Home } from "lucide-react";
import {
  KpiTile,
  KpiTileSkeleton,
} from "@/components/facility/dashboard/kpi-tile";
import { useUnifiedBookings } from "@/hooks/use-unified-bookings";
import { useDashboardFilters } from "@/components/facility/dashboard/dashboard-filters-context";

export function KpiRow() {
  const { bookings, isLoading } = useUnifiedBookings();
  const { tab, setTab, serviceFilter } = useDashboardFilters();

  const counts = useMemo(() => {
    // The main-dashboard tiles cover Boarding & Daycare only. Grooming,
    // Training and custom modules manage their own check-in in their module
    // pages, so they must not count toward these guest/arrival tiles either.
    const boardBookings = bookings.filter(
      (b) => b.serviceKey === "boarding" || b.serviceKey === "daycare",
    );
    const scoped =
      serviceFilter === "all"
        ? boardBookings
        : boardBookings.filter((b) => b.serviceKey === serviceFilter);

    let currentGuests = 0;
    let todaysArrivals = 0;
    let goingHomeToday = 0;
    let checkedOutToday = 0;

    for (const b of scoped) {
      if (b.status === "checked-in") currentGuests++;
      if (b.status === "scheduled") todaysArrivals++;
      if (b.isGoingHomeToday) goingHomeToday++;
      if (b.status === "checked-out") checkedOutToday++;
    }

    return { currentGuests, todaysArrivals, goingHomeToday, checkedOutToday };
  }, [bookings, serviceFilter]);

  const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4";

  // ── FOUR ZEROS ARE NOT A LOADING STATE ─────────────────────────────────
  //
  // Every count above is derived from `bookings`, which is [] until the day
  // queries answer — so this row used to render "0 · 0 · 0 · 0" over a
  // facility with six pets in the building, and the Live Activity Board said
  // "No scheduled arrivals match your filters" beside it. That is not a slow
  // screen, it is a wrong one, and §6 rule 9 is explicit that a state a
  // component does not implement is a bug rather than a decision.
  //
  // The live region is here rather than on each tile: one fact, announced
  // once.
  if (isLoading) {
    return (
      <div className={grid} aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading today&apos;s numbers</span>
        <KpiTileSkeleton />
        <KpiTileSkeleton />
        <KpiTileSkeleton />
        <KpiTileSkeleton />
      </div>
    );
  }

  return (
    // §4's staggered entrance — `yy-rise .28s`, 24ms apart. It is the ONE
    // motion allowed on a surface already showing data, "because it runs once
    // and stops". The stagger is set per child through --yy-i; four tiles is
    // well inside the cap of eight.
    <div
      className={cn(
        grid,
        "*:yy-rise",
        "[&>*:nth-child(2)]:[--yy-i:1]",
        "[&>*:nth-child(3)]:[--yy-i:2]",
        "[&>*:nth-child(4)]:[--yy-i:3]",
      )}
    >
      <KpiTile
        label="Today's Arrivals"
        value={counts.todaysArrivals}
        hint="Scheduled check-ins"
        icon={LogIn}
        tone="amber"
        active={tab === "scheduled"}
        onClick={() => setTab("scheduled")}
      />
      {/* ── §2b territory 2: PRESENCE. ────────────────────────────────────
          "The dashboard 'on premises' tile" is named in the section's own
          screen-by-screen table, and this is that tile — the pets physically
          in the building right now.

          It was `tone="indigo"`, which made it say what the software does
          rather than what is in the room. `brand` is the one tone that
          resolves to orange, and it is opt-in precisely so nothing inherits
          it by accident (see the tone table in kpi-tile.tsx).

          The other three tiles stay as they are, and that is the budget
          holding: arrivals, departures and check-outs are STATES of a record,
          which orange may never mean. One orange idea on this screen. */}
      <KpiTile
        label="Current Guests"
        value={counts.currentGuests}
        hint="Pets currently on-site"
        icon={PawPrint}
        tone="brand"
        active={tab === "checked-in"}
        onClick={() => setTab("checked-in")}
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

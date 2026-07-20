"use client";

import { useMemo, useState } from "react";
import { Home, LogIn, LogOut, PawPrint, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { BookingCard } from "@/components/facility/dashboard/booking-card";
import {
  UnifiedBookingsProvider,
  useUnifiedBookings,
} from "@/hooks/use-unified-bookings";

type BoardTab = "scheduled" | "checked-in" | "going-home" | "checked-out";

interface ServiceCheckInBoardProps {
  /** Service keys this board is scoped to (e.g. ["training"]). */
  serviceKeys: string[];
  title: string;
  description?: string;
}

/**
 * Self-contained per-service check-in / check-out board. Mirrors the main
 * dashboard Live Activity Board (KPI tiles + tabbed booking grid) but scoped to
 * a single service so each module manages its own arrivals and departures. It
 * provides its own UnifiedBookingsProvider, so it can be dropped onto any
 * service module page under the facility layout.
 */
export function ServiceCheckInBoard(props: ServiceCheckInBoardProps) {
  return (
    <UnifiedBookingsProvider>
      <BoardInner {...props} />
    </UnifiedBookingsProvider>
  );
}

function BoardInner({
  serviceKeys,
  title,
  description,
}: ServiceCheckInBoardProps) {
  const { bookings } = useUnifiedBookings();
  const [tab, setTab] = useState<BoardTab>("scheduled");
  const [query, setQuery] = useState("");

  const scoped = useMemo(
    () => bookings.filter((b) => serviceKeys.includes(b.serviceKey)),
    [bookings, serviceKeys],
  );

  const counts = useMemo(() => {
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
  }, [scoped]);

  const queryScoped = useMemo(() => {
    if (!query.trim()) return scoped;
    const v = query.toLowerCase();
    return scoped.filter(
      (b) =>
        b.rawId.toLowerCase().includes(v) ||
        b.petName.toLowerCase().includes(v) ||
        b.ownerName.toLowerCase().includes(v) ||
        b.petBreed.toLowerCase().includes(v) ||
        b.ownerPhone.includes(v),
    );
  }, [query, scoped]);

  const visible = useMemo(() => {
    switch (tab) {
      case "scheduled":
        return queryScoped.filter((b) => b.status === "scheduled");
      case "checked-in":
        return queryScoped.filter(
          (b) => b.status === "checked-in" && !b.isGoingHomeToday,
        );
      case "going-home":
        return queryScoped.filter(
          (b) => b.isGoingHomeToday && b.status === "checked-in",
        );
      case "checked-out":
        return queryScoped.filter((b) => b.status === "checked-out");
    }
  }, [queryScoped, tab]);

  const primaryAction =
    tab === "scheduled"
      ? ("check-in" as const)
      : tab === "going-home"
        ? ("check-out" as const)
        : ("none" as const);

  const emptyText = {
    scheduled: "No scheduled arrivals match your filters",
    "checked-in": "No pets currently checked in",
    "going-home": "No departures expected today",
    "checked-out": "No checked-out reservations today",
  }[tab];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          label="Currently In"
          value={counts.currentGuests}
          hint="Pets currently on-site"
          icon={PawPrint}
          tone="indigo"
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

      <Card className="bg-card overflow-hidden border">
        <CardHeader className="border-b pb-4">
          <div className="relative w-full md:max-w-xl">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reservation ID, pet, owner, or phone…"
              className="h-9 w-full pl-9 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {visible.length === 0 ? (
            <div className="text-muted-foreground flex h-40 items-center justify-center rounded-2xl border border-dashed text-sm">
              {emptyText}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
              {visible.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  primaryAction={primaryAction}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

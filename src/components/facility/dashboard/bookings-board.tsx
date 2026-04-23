"use client";

import { useMemo } from "react";
import { PawPrint, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUnifiedBookings } from "@/hooks/use-unified-bookings";
import { useDashboardFilters } from "@/components/facility/dashboard/dashboard-filters-context";
import { BookingCard } from "@/components/facility/dashboard/booking-card";

export function BookingsBoard() {
  const { bookings } = useUnifiedBookings();
  const { tab, serviceFilter, query, setQuery } = useDashboardFilters();

  const serviceScoped = useMemo(() => {
    return serviceFilter === "all"
      ? bookings
      : bookings.filter((b) => b.serviceKey === serviceFilter);
  }, [bookings, serviceFilter]);

  const queryScoped = useMemo(() => {
    if (!query.trim()) return serviceScoped;
    const v = query.toLowerCase();
    return serviceScoped.filter((b) => {
      return (
        b.rawId.toLowerCase().includes(v) ||
        b.id.toLowerCase().includes(v) ||
        String(b.petId).includes(v) ||
        (b.ownerId != null && String(b.ownerId).includes(v)) ||
        b.petName.toLowerCase().includes(v) ||
        b.ownerName.toLowerCase().includes(v) ||
        b.petBreed.toLowerCase().includes(v) ||
        b.serviceLabel.toLowerCase().includes(v) ||
        b.ownerPhone.includes(v)
      );
    });
  }, [query, serviceScoped]);

  const visible = useMemo(() => {
    switch (tab) {
      case "scheduled":
        return queryScoped.filter((b) => b.status === "scheduled");
      case "checked-in":
        return queryScoped.filter((b) => b.status === "checked-in");
      case "going-home":
        return queryScoped.filter((b) => b.isGoingHomeToday && b.status === "checked-in");
      case "checked-out":
        return queryScoped.filter((b) => b.status === "checked-out");
    }
  }, [queryScoped, tab]);

  const emptyText = useMemo(() => {
    switch (tab) {
      case "scheduled":
        return "No scheduled arrivals match your filters";
      case "checked-in":
        return "No pets currently checked in";
      case "going-home":
        return "No departures expected today";
      case "checked-out":
        return "No checked-out reservations today";
    }
  }, [tab]);

  const primaryAction = useMemo(() => {
    switch (tab) {
      case "scheduled":
        return "check-in" as const;
      case "checked-in":
      case "going-home":
        return "check-out" as const;
      default:
        return "none" as const;
    }
  }, [tab]);

  return (
    <Card
      id="bookings-board"
      className="overflow-hidden border bg-card scroll-mt-24"
    >
      <CardHeader className="relative space-y-0 overflow-hidden border-b bg-gradient-to-br from-card via-card to-sky-50/40 pb-4 dark:to-sky-950/20">
        <div className="pointer-events-none absolute -top-10 right-0 h-32 w-32 rounded-full bg-gradient-to-br from-sky-200/40 via-cyan-200/20 to-transparent blur-2xl dark:from-sky-500/15 dark:via-cyan-500/10" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-sky-500 to-cyan-500 text-white shadow-sm shadow-sky-500/20">
              <PawPrint className="size-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                Live Activity Board
              </h3>
              <p className="text-muted-foreground text-xs">
                Track arrivals, current guests, and departures in real time.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:flex-1 md:justify-end">
            <div className="relative w-full md:max-w-xl">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reservation ID, pet, owner, or phone…"
                className="h-9 w-full pl-9 text-sm"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <BookingList
          items={visible}
          empty={emptyText}
          primaryAction={primaryAction}
        />
      </CardContent>
    </Card>
  );
}

interface BookingListProps {
  items: ReturnType<typeof useUnifiedBookings>["bookings"];
  empty: string;
  primaryAction: "check-in" | "check-out" | "none";
}

function BookingList({ items, empty, primaryAction }: BookingListProps) {
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center rounded-2xl border border-dashed text-sm">
        {empty}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
      {items.map((b) => (
        <BookingCard key={b.id} booking={b} primaryAction={primaryAction} />
      ))}
    </div>
  );
}

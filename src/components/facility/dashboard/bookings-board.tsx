"use client";

import { useMemo, type CSSProperties } from "react";
import { PawPrint, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUnifiedBookings } from "@/hooks/use-unified-bookings";
import { useDashboardFilters } from "@/components/facility/dashboard/dashboard-filters-context";
import { BookingCard } from "@/components/facility/dashboard/booking-card";

export function BookingsBoard() {
  const { bookings, isLoading } = useUnifiedBookings();
  const { tab, serviceFilter, query, setQuery } = useDashboardFilters();

  // The main-dashboard Live Activity Board tracks Boarding & Daycare only.
  // Every other service (Grooming, Training, and custom modules) manages its
  // own check-in / check-out in its own module page, so they are excluded here.
  const boardBookings = useMemo(
    () =>
      bookings.filter(
        (b) => b.serviceKey === "boarding" || b.serviceKey === "daycare",
      ),
    [bookings],
  );

  const serviceScoped = useMemo(() => {
    return serviceFilter === "all"
      ? boardBookings
      : boardBookings.filter((b) => b.serviceKey === serviceFilter);
  }, [boardBookings, serviceFilter]);

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
        return "none" as const;
      case "going-home":
        return "check-out" as const;
      default:
        return "none" as const;
    }
  }, [tab]);

  return (
    <Card
      id="bookings-board"
      className="bg-card scroll-mt-24 overflow-hidden border"
    >
      <CardHeader className="relative space-y-0 overflow-hidden border-b pb-4">
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-primary flex size-11 items-center justify-center rounded-2xl text-white shadow-sm">
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
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
}

interface BookingListProps {
  items: ReturnType<typeof useUnifiedBookings>["bookings"];
  empty: string;
  primaryAction: "check-in" | "check-out" | "none";
  isLoading: boolean;
}

const GRID = "grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3";

function BookingList({
  items,
  empty,
  primaryAction,
  isLoading,
}: BookingListProps) {
  // ── "NO SCHEDULED ARRIVALS" IS A CLAIM, AND IT WAS BEING MADE TOO EARLY ──
  //
  // `items` is [] until the day queries answer, so this board told the desk
  // there was nobody coming while six pets were on site. The empty sentence
  // below is now reserved for what it actually means: the query answered, and
  // the answer is none.
  //
  // Three card-shaped skeletons rather than one bar, because the row that
  // arrives is a grid of cards — the placeholder should be the shape of the
  // thing it stands in for, or the layout jumps when the data lands.
  if (isLoading) {
    return (
      <div className={GRID} aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading today&apos;s activity</span>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            aria-hidden
            className="border-line bg-card yy-skel flex h-[86px] items-center gap-3 rounded-2xl border p-3"
          >
            <div className="bg-muted size-11 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="bg-muted h-[13px] w-24 rounded-full" />
              <div className="bg-muted h-[11px] w-32 rounded-full" />
              <div className="bg-muted h-[11px] w-20 rounded-full" />
            </div>
            <div className="bg-muted h-9 w-24 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center rounded-2xl border border-dashed text-sm">
        {empty}
      </div>
    );
  }
  // One card per row on phones: at 2 columns a card is ~180px, which the avatar
  // and Check In button consume entirely, collapsing the pet/owner details to
  // zero width instead of overflowing — so a clipping probe reports it clean
  // while it is unusable.
  return (
    <div className={cn(GRID, "*:yy-rise")}>
      {items.map((b, i) => (
        // §4's stagger: 24ms per item, CAPPED AT EIGHT. The cap is the whole
        // reason this is arithmetic rather than a class per row — a board can
        // hold forty cards, and "past 192ms a stagger stops reading as
        // choreography and starts reading as a slow server".
        <div key={b.id} style={{ "--yy-i": Math.min(i, 7) } as CSSProperties}>
          <BookingCard booking={b} primaryAction={primaryAction} />
        </div>
      ))}
    </div>
  );
}

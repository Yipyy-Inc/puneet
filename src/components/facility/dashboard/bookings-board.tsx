"use client";

import { useMemo } from "react";
import { CalendarClock, Home, PawPrint, Search } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUnifiedBookings } from "@/hooks/use-unified-bookings";
import {
  useDashboardFilters,
  type BoardTab,
} from "@/components/facility/dashboard/dashboard-filters-context";
import { BookingCard } from "@/components/facility/dashboard/booking-card";
import { CheckedOutSheet } from "@/components/facility/dashboard/checked-out-sheet";

export function BookingsBoard() {
  const { bookings, counts } = useUnifiedBookings();
  const { tab, setTab, serviceFilter, query, setQuery } = useDashboardFilters();

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (serviceFilter !== "all" && b.serviceKey !== serviceFilter)
        return false;
      if (!query.trim()) return true;
      const v = query.toLowerCase();
      return (
        b.petName.toLowerCase().includes(v) ||
        b.ownerName.toLowerCase().includes(v) ||
        b.petBreed.toLowerCase().includes(v) ||
        b.serviceLabel.toLowerCase().includes(v) ||
        b.ownerPhone.includes(v)
      );
    });
  }, [bookings, query, serviceFilter]);

  const scheduled = filtered.filter((b) => b.status === "scheduled");
  const checkedIn = filtered.filter((b) => b.status === "checked-in");
  const goingHome = filtered.filter(
    (b) => b.isGoingHomeToday && b.status === "checked-in",
  );
  const checkedOut = filtered.filter((b) => b.status === "checked-out");

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
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pet, owner, or breed…"
                className="h-9 w-[280px] pl-9 text-sm"
              />
            </div>
            <CheckedOutSheet
              bookings={checkedOut}
              count={counts.checkedOutToday}
            />
          </div>
        </div>
      </CardHeader>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as BoardTab)}
        className="gap-0"
      >
        <TabsList className="w-full justify-start gap-0 border-b bg-transparent px-4 pt-2">
          <BoardTabTrigger
            value="scheduled"
            label="Scheduled Arrivals"
            count={scheduled.length}
            icon={<CalendarClock className="size-4" />}
          />
          <BoardTabTrigger
            value="checked-in"
            label="Currently Checked In"
            count={checkedIn.length}
            icon={<PawPrint className="size-4" />}
          />
          <BoardTabTrigger
            value="going-home"
            label="Going Home Today"
            count={goingHome.length}
            icon={<Home className="size-4" />}
          />
        </TabsList>

        <CardContent className="p-4 sm:p-5">
          <TabsContent value="scheduled" className="m-0">
            <BookingList
              items={scheduled}
              empty="No scheduled arrivals match your filters"
              primaryAction="check-in"
            />
          </TabsContent>
          <TabsContent value="checked-in" className="m-0">
            <BookingList
              items={checkedIn}
              empty="No pets currently checked in"
              primaryAction="none"
            />
          </TabsContent>
          <TabsContent value="going-home" className="m-0">
            <BookingList
              items={goingHome}
              empty="No departures expected today"
              primaryAction="check-out"
            />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}

interface BoardTabTriggerProps {
  value: BoardTab;
  label: string;
  count: number;
  icon: React.ReactNode;
}

function BoardTabTrigger({ value, label, count, icon }: BoardTabTriggerProps) {
  return (
    <TabsTrigger
      value={value}
      className="data-[state=active]:bg-card data-[state=active]:border-b-primary"
    >
      {icon}
      <span>{label}</span>
      <Badge
        variant="secondary"
        className="ml-1 h-5 min-w-[1.25rem] px-1.5 text-[11px] tabular-nums"
      >
        {count}
      </Badge>
    </TabsTrigger>
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
    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((b) => (
        <BookingCard key={b.id} booking={b} primaryAction={primaryAction} />
      ))}
    </div>
  );
}

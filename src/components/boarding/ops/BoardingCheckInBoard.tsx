"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  BedDouble,
  Home,
  LogIn,
  LogOut,
  PawPrint,
  Search,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import {
  summariseBoardingDay,
  useBoardingCheckIn,
  useBoardingDay,
  useBoardingRevert,
  useBoardingStayUpdate,
} from "@/lib/api/boarding-attendance";
import type { BoardingArrival } from "@/lib/api/mappers/boarding-arrival";

// ============================================================================
// The boarding arrivals board.
//
// The boarding check-in route rendered <DaycareCheckInOutSection /> — the
// daycare floor, on the boarding screen. Once that board became real it started
// posting to /api/daycare/attendance, which refuses a boarding booking outright,
// so the page could not check anybody in. Before that it "worked" by editing a
// daycare fixture in local state.
//
// ── WHY NOT ServiceCheckInBoard ───────────────────────────────────────────
//
// The generic board (used by training and custom modules) reads
// `useUnifiedBookings`, which is five fixture arrays in `useState`. Pointing
// this page at it would have swapped one fixture for another. Boarding also
// needs two things that board has no concept of: a kennel, and a guest who is
// LATE — states that only exist once the dates are real.
// ============================================================================

type BoardTab = "expected" | "on-site" | "departing" | "gone-home";

const TAB_EMPTY: Record<BoardTab, string> = {
  expected: "No arrivals booked for today",
  "on-site": "No guests are checked in",
  departing: "Nobody is due to leave today",
  "gone-home": "Nobody has been collected yet today",
};

function timeOf(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateOf(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function BoardingCheckInBoard() {
  const { data, isLoading, error } = useBoardingDay();
  const checkIn = useBoardingCheckIn();
  const updateStay = useBoardingStayUpdate();
  const revert = useBoardingRevert();

  const [tab, setTab] = useState<BoardTab>("expected");
  const [query, setQuery] = useState("");

  const guests = useMemo(() => data?.guests ?? [], [data]);
  const summary = useMemo(() => summariseBoardingDay(data), [data]);

  const matching = useMemo(() => {
    const v = query.trim().toLowerCase();
    if (!v) return guests;
    return guests.filter(
      (g) =>
        g.id.includes(v) ||
        g.ownerName.toLowerCase().includes(v) ||
        g.ownerPhone.includes(v) ||
        g.roomName?.toLowerCase().includes(v) ||
        g.petNames.some((n) => n.toLowerCase().includes(v)),
    );
  }, [guests, query]);

  const visible = useMemo(() => {
    switch (tab) {
      case "expected":
        return matching.filter((g) => g.status === "scheduled");
      case "on-site":
        return matching.filter((g) => g.status === "checked-in");
      case "departing":
        return matching.filter(
          (g) =>
            g.status === "checked-in" && (g.isDepartingToday || g.isOverdue),
        );
      case "gone-home":
        return matching.filter((g) => g.status === "checked-out");
    }
  }, [matching, tab]);

  const overdue = useMemo(() => guests.filter((g) => g.isOverdue), [guests]);

  const onError = (err: Error) => toast.error(err.message);

  const doCheckIn = (guest: BoardingArrival) =>
    checkIn.mutate(Number(guest.id), {
      onSuccess: () =>
        toast.success(`${guest.petNames.join(", ")} — checked in`, {
          description: guest.roomName ?? undefined,
        }),
      onError,
    });

  const doCheckOut = (guest: BoardingArrival) =>
    updateStay.mutate(
      { bookingRef: Number(guest.id), checkOut: true },
      {
        onSuccess: () =>
          toast.success(`${guest.petNames.join(", ")} — checked out`, {
            // The inverse REQUEST, not a restored copy of the old object. The
            // departure has left the tab, so undoing it has to as well.
            action: {
              label: "Undo",
              onClick: () =>
                updateStay.mutate(
                  { bookingRef: Number(guest.id), reopen: true },
                  {
                    onSuccess: () => toast.success("Checkout undone"),
                    onError,
                  },
                ),
            },
          }),
        onError,
      },
    );

  const doRevert = (guest: BoardingArrival) =>
    revert.mutate(Number(guest.id), {
      onSuccess: () =>
        toast.success(`${guest.petNames.join(", ")} — arrival reverted`, {
          description: "The kennel is still theirs",
        }),
      onError,
    });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertDescription>
          Could not load today&apos;s guests: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Boarding Check-In / Check-Out
        </h2>
        <p className="text-muted-foreground text-sm">
          Arrivals and departures for{" "}
          {dateOf(data?.date ?? new Date().toISOString())}. A guest must have a
          kennel before they can be checked in.
        </p>
      </div>

      {overdue.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            {overdue.length} guest{overdue.length === 1 ? " is" : "s are"} still
            on site past their booked departure:{" "}
            {overdue.map((g) => g.petNames.join(", ")).join("; ")}.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Expected Today"
          value={summary.expected}
          hint={
            summary.unassigned > 0
              ? undefined
              : "Booked across today, not yet arrived"
          }
          alert={
            summary.unassigned > 0
              ? {
                  label: `${summary.unassigned} without a kennel`,
                  tone: "amber",
                }
              : undefined
          }
          icon={LogIn}
          tone="amber"
          active={tab === "expected"}
          onClick={() => setTab("expected")}
        />
        <KpiTile
          label="On Site"
          value={summary.onSite}
          hint="Checked in and not collected"
          icon={PawPrint}
          tone="indigo"
          active={tab === "on-site"}
          onClick={() => setTab("on-site")}
        />
        <KpiTile
          label="Going Home Today"
          value={summary.departingToday}
          hint="Booked out today"
          alert={
            summary.overdue > 0
              ? { label: `${summary.overdue} overdue`, tone: "rose" }
              : undefined
          }
          icon={Home}
          tone="violet"
          active={tab === "departing"}
          onClick={() => setTab("departing")}
        />
        <KpiTile
          label="Collected"
          value={summary.goneHome}
          hint="Checked out today"
          icon={LogOut}
          tone="emerald"
          active={tab === "gone-home"}
          onClick={() => setTab("gone-home")}
        />
      </div>

      <Card className="bg-card overflow-hidden border">
        <CardHeader className="border-b pb-4">
          <div className="relative w-full md:max-w-xl">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search booking, pet, owner, phone or kennel…"
              className="h-9 w-full pl-9 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {visible.length === 0 ? (
            <div className="text-muted-foreground flex h-40 items-center justify-center rounded-2xl border border-dashed px-6 text-center text-sm">
              {TAB_EMPTY[tab]}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {visible.map((guest) => (
                <GuestCard
                  key={guest.id}
                  guest={guest}
                  busy={
                    checkIn.isPending ||
                    updateStay.isPending ||
                    revert.isPending
                  }
                  onCheckIn={() => doCheckIn(guest)}
                  onCheckOut={() => doCheckOut(guest)}
                  onReopen={() =>
                    updateStay.mutate(
                      { bookingRef: Number(guest.id), reopen: true },
                      {
                        onSuccess: () => toast.success("Stay reopened"),
                        onError,
                      },
                    )
                  }
                  onRevert={() => doRevert(guest)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface GuestCardProps {
  guest: BoardingArrival;
  busy: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onReopen: () => void;
  onRevert: () => void;
}

function GuestCard({
  guest,
  busy,
  onCheckIn,
  onCheckOut,
  onReopen,
  onRevert,
}: GuestCardProps) {
  const names = guest.petNames.length > 0 ? guest.petNames.join(", ") : "Guest";

  return (
    <div
      data-status={guest.status}
      data-overdue={guest.isOverdue ? "true" : undefined}
      className="bg-card flex flex-col gap-3 rounded-2xl border p-4 data-[overdue=true]:border-rose-300 dark:data-[overdue=true]:border-rose-800"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{names}</p>
          <p className="text-muted-foreground truncate text-xs">
            {guest.ownerName} · #{guest.id}
          </p>
        </div>
        {guest.isOverdue && <Badge variant="destructive">Overdue</Badge>}
      </div>

      <div className="text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1">
          <BedDouble className="size-3.5 shrink-0" />
          {guest.roomName ?? "No kennel"}
        </span>
        <span>
          {guest.nights} night{guest.nights === 1 ? "" : "s"}
        </span>
        <span>
          In:{" "}
          {guest.checkedInAt
            ? timeOf(guest.checkedInAt)
            : "due " + dateOf(guest.scheduledArrival)}
        </span>
        <span>
          Out:{" "}
          {guest.checkedOutAt
            ? timeOf(guest.checkedOutAt)
            : "due " + dateOf(guest.scheduledDeparture)}
        </span>
      </div>

      {guest.status === "scheduled" &&
        (guest.roomId ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={onCheckIn}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <LogIn className="size-4" /> Check In
          </Button>
        ) : (
          // Not a disabled button with no explanation: the reason is fixable
          // and the fix is one screen away.
          <Button size="sm" variant="outline" asChild>
            <Link href="/facility/dashboard/services/boarding/ops?tab=kennels">
              <BedDouble className="size-4" /> Assign a kennel first
            </Link>
          </Button>
        ))}

      {guest.status === "checked-in" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={onCheckOut}
            className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <LogOut className="size-4" /> Check Out
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onRevert}>
            Not here
          </Button>
        </div>
      )}

      {guest.status === "checked-out" && (
        <Button size="sm" variant="outline" disabled={busy} onClick={onReopen}>
          Reopen stay
        </Button>
      )}
    </div>
  );
}

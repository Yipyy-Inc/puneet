"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  availabilityQueries,
  useProposeAvailability,
} from "@/lib/api/scheduling";
import type { AvailabilityDay } from "@/lib/api/mappers/scheduling";

// ============================================================================
// "When I can work", proposed.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// A `useState` seeded from `staffAvailability` in src/data, ending in
// `// TODO: persist to a real availability store / API` directly above
// `toast.success("Availability submitted")`.
//
// The facility's side of this was made real on 2026-08-21 — `staff_availability`
// holds the live pattern, `staff_availability_requests` holds proposals, and
// the approval queue at scheduling/availability-changes reads both. Nothing
// could file into it. The insert policy had been written for exactly this
// caller (own staff row plus `view_own_schedule`) and had never been exercised.
//
// ── A CHANGE IS PROPOSED, NOT APPLIED ─────────────────────────────────────
//
// Submitting does NOT rewrite the live pattern; it files a request a manager
// approves, and `approve_availability_request` applies it in one transaction.
// That is the whole point of the table: somebody who could silently make
// themselves unavailable for next week has rewritten a roster that was already
// built around them.
//
// ── AN EMPTY WEEK MEANS AVAILABLE, NOT UNAVAILABLE ────────────────────────
//
// This screen used to default every unstated day to `isAvailable: false`, so a
// new hire who had never opened it appeared unable to work at all. The table
// reads the other way — `toAvailabilityWeek` fills gaps as available with no
// window, and a null window means ALL DAY — because "has not said" and "has
// said no" are different facts and the conflict checker must not confuse them.
// ============================================================================

// Monday-first order over dayOfWeek (0 = Sunday … 6 = Saturday, matching
// `Date.getDay()` and the column the migration chose to agree with it).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABEL: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

interface DayRow {
  dayOfWeek: number;
  isAvailable: boolean;
  /** Blank on both means all day, which is what the table stores as NULL. */
  startTime: string;
  endTime: string;
}

const ALL_DAY = { startTime: "", endTime: "" };

function toRows(week: AvailabilityDay[] | undefined): DayRow[] {
  return DAY_ORDER.map((dow) => {
    const day = week?.find((d) => d.dayOfWeek === dow);
    return {
      dayOfWeek: dow,
      // Unstated is AVAILABLE — see the header. The old default was the
      // opposite and quietly marked every new hire unable to work.
      isAvailable: day?.isAvailable ?? true,
      startTime: day?.startTime ?? ALL_DAY.startTime,
      endTime: day?.endTime ?? ALL_DAY.endTime,
    };
  });
}

/** Tomorrow, as a plain date — the earliest a change can sensibly take effect. */
function tomorrow(): string {
  const d = new Date(Date.now() + 86_400_000);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function AvailabilityView() {
  const { data, isPending, error } = useQuery(availabilityQueries.all());
  const propose = useProposeAvailability();

  const myStaffId = data?.myStaffId;
  const livePattern = useMemo(
    () => (myStaffId ? data?.patterns[myStaffId] : undefined),
    [data, myStaffId],
  );

  // The server's week is the truth; state holds only what the person has
  // EDITED since it arrived. Syncing the two with an effect would mean
  // rendering a guessed week first and correcting it — and would need a
  // setState inside an effect, which is a re-render this can simply not have.
  const [draft, setDraft] = useState<DayRow[] | null>(null);
  const days = useMemo(
    () => draft ?? toRows(livePattern),
    [draft, livePattern],
  );

  /** A proposal already awaiting a decision. Filing a second is confusing. */
  const openRequest = useMemo(
    () =>
      (data?.requests ?? []).find(
        (r) => r.employeeId === myStaffId && r.status === "pending",
      ),
    [data, myStaffId],
  );

  const setDay = (dow: number, patch: Partial<DayRow>) =>
    setDraft((prev) =>
      (prev ?? toRows(livePattern)).map((d) =>
        d.dayOfWeek === dow ? { ...d, ...patch } : d,
      ),
    );

  // Half a window is not a window — the table refuses it, so the form does too
  // rather than letting a constraint name reach somebody as an error.
  const halfWindow = days.some(
    (d) => d.isAvailable && Boolean(d.startTime) !== Boolean(d.endTime),
  );
  // A window that ENDS BEFORE it starts is a night shift wrapping past
  // midnight, which the table deliberately allows — so the only bad case is a
  // day that starts and ends at the same moment, i.e. no time at all.
  const emptyWindow = days.some(
    (d) => d.isAvailable && Boolean(d.startTime) && d.startTime === d.endTime,
  );
  const availableCount = days.filter((d) => d.isAvailable).length;
  const blocked = halfWindow || emptyWindow;

  const submit = () => {
    if (halfWindow) {
      toast.error(
        "Give each day both a start and an end, or leave both blank.",
      );
      return;
    }
    if (emptyWindow) {
      toast.error("A day cannot start and end at the same time.");
      return;
    }

    propose.mutate(
      {
        // Seven days, Sunday to Saturday — the route validates the whole week
        // rather than accepting a partial one, so "unstated" cannot creep back
        // in through a proposal.
        proposed: days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          isAvailable: d.isAvailable,
          startTime: d.isAvailable && d.startTime ? d.startTime : undefined,
          endTime: d.isAvailable && d.endTime ? d.endTime : undefined,
        })),
        effectiveFrom: tomorrow(),
      },
      {
        onSuccess: () => {
          // Back to following the server. The proposal is pending, so the LIVE
          // pattern is still the old one — holding the edit on screen would
          // show a week that is not in force yet.
          setDraft(null);
          toast.success(
            "Availability change requested. Your manager will review it.",
          );
        },
        onError: (mutationError: Error) => toast.error(mutationError.message),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <CalendarClock className="text-primary size-6" /> My Availability
        </h1>
        <p className="text-muted-foreground text-sm">
          Tell your manager which days and hours you can work. A change is
          reviewed before it takes effect.
        </p>
      </div>

      {error ? (
        <Card className="border-rose-200 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:text-rose-400">
          {(error as Error).message}
        </Card>
      ) : null}

      {/* Filing a second proposal over an undecided one gives the manager two
          answers to the same question. */}
      {openRequest ? (
        <Card className="border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          You already have a change waiting for a decision. Submitting again
          replaces nothing until that one is answered.
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Weekly availability</CardTitle>
          {!isPending && !livePattern ? (
            <Badge variant="outline" className="text-xs font-normal">
              Not set — available all week
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {isPending
            ? DAY_ORDER.map((dow) => (
                <Skeleton key={dow} className="h-14 w-full" />
              ))
            : days.map((d) => {
                const invalid =
                  d.isAvailable && Boolean(d.startTime) !== Boolean(d.endTime);
                return (
                  <div
                    key={d.dayOfWeek}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors",
                      d.isAvailable ? "border-border/60" : "bg-muted/30",
                    )}
                  >
                    <div className="flex w-32 items-center gap-2">
                      <Switch
                        checked={d.isAvailable}
                        onCheckedChange={(v) =>
                          setDay(d.dayOfWeek, { isAvailable: v })
                        }
                        aria-label={`Available on ${DAY_LABEL[d.dayOfWeek]}`}
                      />
                      <span className="text-sm font-medium">
                        {DAY_LABEL[d.dayOfWeek]}
                      </span>
                    </div>

                    {d.isAvailable ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={d.startTime}
                          onChange={(e) =>
                            setDay(d.dayOfWeek, { startTime: e.target.value })
                          }
                          className={cn("w-32", invalid && "border-rose-400")}
                        />
                        <span className="text-muted-foreground text-xs">
                          to
                        </span>
                        <Input
                          type="time"
                          value={d.endTime}
                          onChange={(e) =>
                            setDay(d.dayOfWeek, { endTime: e.target.value })
                          }
                          className={cn("w-32", invalid && "border-rose-400")}
                        />
                        {!d.startTime && !d.endTime ? (
                          <span className="text-muted-foreground text-xs">
                            all day
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Not available
                      </span>
                    )}
                  </div>
                );
              })}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          {availableCount} of 7 days marked available. Leave both times blank
          for a whole day.
        </p>
        <Button
          onClick={submit}
          disabled={blocked || isPending || propose.isPending}
        >
          {propose.isPending ? "Submitting…" : "Request change"}
        </Button>
      </div>
    </div>
  );
}

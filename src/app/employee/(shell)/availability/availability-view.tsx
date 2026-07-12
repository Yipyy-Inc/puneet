"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CalendarClock } from "lucide-react";
import { staffAvailability } from "@/data/staff-availability";
import { getCurrentUserId } from "@/lib/role-utils";
import { users } from "@/data/users";

// Monday-first order over dayOfWeek (0 = Sunday … 6 = Saturday).
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

interface DayAvailability {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
}

export function AvailabilityView() {
  const [staffId] = useState<number>(() => {
    const id = getCurrentUserId() ?? users.find((u) => u.role === "Staff")?.id;
    return typeof id === "string" ? parseInt(id, 10) : (id ?? 4);
  });

  // Seed each day from the staff member's saved availability (data/staff-availability).
  const [days, setDays] = useState<DayAvailability[]>(() =>
    DAY_ORDER.map((dow) => {
      const row = staffAvailability.find(
        (a) => a.staffId === staffId && a.dayOfWeek === dow,
      );
      return {
        dayOfWeek: dow,
        isAvailable: row?.isAvailable ?? false,
        startTime: row?.startTime ?? "09:00",
        endTime: row?.endTime ?? "17:00",
      };
    }),
  );

  const setDay = (dow: number, patch: Partial<DayAvailability>) =>
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dow ? { ...d, ...patch } : d)),
    );

  const hasInvalidRange = days.some(
    (d) => d.isAvailable && d.startTime >= d.endTime,
  );
  const availableCount = days.filter((d) => d.isAvailable).length;

  const submit = () => {
    if (hasInvalidRange) {
      toast.error("Each available day needs a start time before its end time.");
      return;
    }
    // TODO: persist to a real availability store / API.
    toast.success(
      `Availability submitted — ${availableCount} day(s) available`,
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <CalendarClock className="text-primary size-6" /> My Availability
        </h1>
        <p className="text-muted-foreground text-sm">
          Tell your manager which days and hours you can work. They&apos;ll use
          this when building the schedule.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Weekly availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {days.map((d) => {
            const invalid = d.isAvailable && d.startTime >= d.endTime;
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
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input
                      type="time"
                      value={d.endTime}
                      onChange={(e) =>
                        setDay(d.dayOfWeek, { endTime: e.target.value })
                      }
                      className={cn("w-32", invalid && "border-rose-400")}
                    />
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
          {availableCount} of 7 days marked available.
        </p>
        <Button onClick={submit} disabled={hasInvalidRange}>
          Submit availability
        </Button>
      </div>
    </div>
  );
}

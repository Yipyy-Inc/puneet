"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { CalendarDays } from "lucide-react";

export type RangePreset = "today" | "week" | "month" | "year" | "custom";

export interface DateRange {
  preset: RangePreset;
  start: Date;
  end: Date;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Resolve a named preset to a concrete [start, end] window around `now`. */
export function presetRange(
  preset: Exclude<RangePreset, "custom">,
  now: Date = new Date(),
): DateRange {
  switch (preset) {
    case "today":
      return { preset, start: startOfDay(now), end: endOfDay(now) };
    case "week": {
      // Sunday-start calendar week
      const start = startOfDay(now);
      start.setDate(now.getDate() - now.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { preset, start, end: endOfDay(end) };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { preset, start, end: endOfDay(end) };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { preset, start, end: endOfDay(end) };
    }
  }
}

/** True if the given YYYY-MM-DD (or ISO) date string falls within the range. */
export function isWithinRange(dateStr: string, range: DateRange): boolean {
  const parts = dateStr.slice(0, 10).split("-").map(Number);
  // Parse as a local date so comparisons don't drift across time zones.
  const d = new Date(parts[0], (parts[1] ?? 1) - 1, parts[2] ?? 1);
  return d.getTime() >= range.start.getTime() && d.getTime() <= range.end.getTime();
}

const PRESETS: { key: Exclude<RangePreset, "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

function formatRange(range: DateRange): string {
  const sameDay = range.start.toDateString() === range.end.toDateString();
  if (sameDay) {
    return range.start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  const start = range.start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = range.end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} – ${end}`;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function GiftCardDateRangeFilter({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  // Pending two-click selection inside the Custom calendar.
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="bg-muted/40 inline-flex items-center gap-0.5 rounded-lg border p-1">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={value.preset === p.key ? "default" : "ghost"}
            className="h-7 px-3 text-xs font-medium"
            onClick={() => onChange(presetRange(p.key))}
          >
            {p.label}
          </Button>
        ))}

        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) {
              // Seed the calendar with the committed custom range, if any.
              setPendingStart(value.preset === "custom" ? value.start : null);
              setPendingEnd(value.preset === "custom" ? value.end : null);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant={value.preset === "custom" ? "default" : "ghost"}
              className="h-7 gap-1.5 px-3 text-xs font-medium"
            >
              <CalendarDays className="size-3.5" />
              Custom
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="border-border/60 w-auto p-3 shadow-2xl"
          >
            <p className="text-muted-foreground mb-2 px-1 text-xs font-semibold uppercase tracking-wide">
              Custom Range
            </p>
            <DateSelectionCalendar
              mode="range"
              rangeStart={pendingStart}
              rangeEnd={pendingEnd}
              onRangeChange={(start, end) => {
                setPendingStart(start);
                setPendingEnd(end);
                if (start && end) {
                  onChange({
                    preset: "custom",
                    start: startOfDay(start),
                    end: endOfDay(end),
                  });
                  setTimeout(() => setOpen(false), 180);
                }
              }}
              showTimeSelection={false}
            />
          </PopoverContent>
        </Popover>
      </div>

      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
        <CalendarDays className="size-3.5" />
        {formatRange(value)}
      </span>
    </div>
  );
}

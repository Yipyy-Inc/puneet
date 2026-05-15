"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DayDensity } from "@/lib/grooming-scheduling";

// ─── Date helpers (local, no external date lib) ──────────────────────────────

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fromIso(iso: string): Date | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// ─── Density → dot styling ───────────────────────────────────────────────────

function dotClassFor(density: DayDensity | null): string | null {
  switch (density) {
    case "plenty":
      return "bg-emerald-500";
    case "limited":
      return "bg-amber-500";
    case "waitlist":
      return "bg-red-500";
    default:
      return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface DensityCalendarProps {
  /** Selected date — ISO (YYYY-MM-DD) or "". */
  value: string;
  onChange: (next: string) => void;
  /** Returns density for a given ISO date. null = no dot (closed / off-day). */
  getDensityForDate: (dateStr: string) => DayDensity | null;
  /** Earliest selectable date (ISO). Defaults to today. */
  minDate?: string;
}

export function DensityCalendar({
  value,
  onChange,
  getDensityForDate,
  minDate,
}: DensityCalendarProps) {
  const selected = value ? fromIso(value) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const minDateObj = useMemo(() => {
    if (minDate) {
      const parsed = fromIso(minDate);
      if (parsed) return parsed;
    }
    return today;
  }, [minDate, today]);

  const cells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const firstWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 6 rows × 7 cols = 42 cells, with leading blanks before day 1.
    const out: Array<{ date: Date | null; iso: string | null }> = [];
    for (let i = 0; i < firstWeekday; i++) out.push({ date: null, iso: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      out.push({ date, iso: toIso(date) });
    }
    while (out.length < 42) out.push({ date: null, iso: null });
    return out;
  }, [viewMonth]);

  function prevMonth() {
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
    );
  }
  function nextMonth() {
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={prevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="text-sm font-semibold">
          {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={nextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Weekday labels */}
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={`${d}-${i}`}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.date || !cell.iso) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          const density = getDensityForDate(cell.iso);
          const dotClass = dotClassFor(density);
          const isSelected = value === cell.iso;
          const isToday = toIso(today) === cell.iso;
          const isDisabled = cell.date < minDateObj;
          const isFullyBooked = density === "waitlist";

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(cell.iso!)}
              data-selected={isSelected ? "true" : "false"}
              className={cn(
                "relative aspect-square rounded-md text-xs font-medium transition-colors",
                "flex flex-col items-center justify-center gap-0.5",
                isDisabled && "opacity-30 cursor-not-allowed",
                !isDisabled && "hover:bg-muted",
                isSelected &&
                  "bg-pink-100 text-pink-900 ring-2 ring-pink-300 dark:bg-pink-950/40 dark:text-pink-100 dark:ring-pink-700",
                !isSelected &&
                  isToday &&
                  "text-pink-700 dark:text-pink-300 font-semibold",
                !isSelected &&
                  isFullyBooked &&
                  "text-red-600 dark:text-red-300",
              )}
              aria-label={cell.iso}
              title={
                density === "plenty"
                  ? "Plenty of slots open"
                  : density === "limited"
                    ? "Limited slots"
                    : density === "waitlist"
                      ? "Fully booked — waitlist only"
                      : undefined
              }
            >
              <span>{cell.date.getDate()}</span>
              {dotClass && (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    dotClass,
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Plenty
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Limited
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-red-500" />
          Waitlist
        </span>
      </div>
    </div>
  );
}

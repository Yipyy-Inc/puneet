"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { CalendarDays, X, Calendar as CalendarIcon, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const PRESETS = [
  {
    label: "Today",
    icon: CalendarIcon,
    getValue: () => {
      const today = getToday();
      return { start: today, end: today };
    },
  },
  {
    label: "Last 7 Days",
    icon: Clock,
    getValue: () => {
      const end = getToday();
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start, end };
    },
  },
  {
    label: "Next 7 Days",
    icon: ArrowRight,
    getValue: () => {
      const start = getToday();
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
    },
  },
  {
    label: "This Month",
    icon: CalendarDays,
    getValue: () => {
      const d = getToday();
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { start, end };
    },
  },
  {
    label: "Last Month",
    icon: Clock,
    getValue: () => {
      const d = getToday();
      const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const end = new Date(d.getFullYear(), d.getMonth(), 0);
      return { start, end };
    },
  },
];

export function BookingDateRangeFilter({
  rangeStart,
  rangeEnd,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasFilter = !!rangeStart;

  const isSingleDay =
    rangeStart &&
    rangeEnd &&
    rangeStart.toDateString() === rangeEnd.toDateString();

  const label = hasFilter
    ? isSingleDay || !rangeEnd
      ? fmtShort(rangeStart!)
      : `${fmtShort(rangeStart!)} → ${fmtShort(rangeEnd!)}`
    : "Filter by date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasFilter ? "default" : "outline"}
          size="sm"
          className={cn("gap-1.5", hasFilter && "pr-1.5")}
        >
          <CalendarDays className="size-4 shrink-0" />
          <span>{label}</span>
          {hasFilter && (
            <span
              role="button"
              aria-label="Clear date filter"
              className="ml-0.5 flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-white/25"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null, null);
              }}
            >
              <X className="size-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="border-border/60 w-auto p-0 shadow-2xl"
      >
        <div className="flex">
          {/* Presets Sidebar */}
          <div className="w-[140px] border-r p-2 space-y-1 bg-slate-50/50 hidden sm:block">
            <p className="text-muted-foreground px-2 py-1.5 text-[10px] font-bold tracking-wider uppercase">
              Quick Select
            </p>
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <Button
                  key={preset.label}
                  variant="ghost"
                  className="w-full justify-start gap-2 h-8 px-2 text-xs font-normal"
                  onClick={() => {
                    const { start, end } = preset.getValue();
                    onChange(start, end);
                    setOpen(false);
                  }}
                >
                  <Icon className="size-3.5 text-muted-foreground" />
                  {preset.label}
                </Button>
              );
            })}
          </div>

          <div className="space-y-2 p-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Filter by Date Range
              </p>
              {hasFilter && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground text-[11px] underline underline-offset-2"
                  onClick={() => {
                    onChange(null, null);
                    setOpen(false);
                  }}
                >
                  Clear
                </button>
            )}
          </div>

          <DateSelectionCalendar
            mode="range"
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onRangeChange={(start, end) => {
              onChange(start, end);
              // Auto-close once a full range (or single day re-click) is committed
              if (start && end) {
                setTimeout(() => setOpen(false), 180);
              }
            }}
            showTimeSelection={false}
          />

          {hasFilter && (
              <div className="flex items-center justify-between border-t pt-2 mt-2">
                <p className="text-muted-foreground text-[11px]">
                  {rangeEnd && !isSingleDay
                    ? `${Math.round((rangeEnd.getTime() - rangeStart!.getTime()) / 86_400_000) + 1} days selected`
                    : "1 day selected"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setOpen(false)}
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

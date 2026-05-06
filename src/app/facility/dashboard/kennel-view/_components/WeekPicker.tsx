"use client";

import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface WeekPickerProps {
  value: string;
  onValueChange: (iso: string) => void;
  className?: string;
}

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

const PRESETS: { label: string; weeksOffset: number }[] = [
  { label: "This week", weeksOffset: 0 },
  { label: "Next week", weeksOffset: 1 },
  { label: "In 2 weeks", weeksOffset: 2 },
  { label: "In 3 weeks", weeksOffset: 3 },
  { label: "In a month", weeksOffset: 4 },
];

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseIso(iso: string): Date | null {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function WeekPicker({ value, onValueChange, className }: WeekPickerProps) {
  const [open, setOpen] = useState(false);
  const initialDate = useMemo(
    () => parseIso(value) ?? new Date(),
    [value],
  );
  const [viewMonth, setViewMonth] = useState(
    () => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  );
  const [hoveredWeekStart, setHoveredWeekStart] = useState<string | null>(null);

  const selectedWeekStart = value
    ? toIso(startOfWeek(parseIso(value) ?? new Date()))
    : "";
  const todayIso = toIso(new Date());
  const thisWeekStart = toIso(startOfWeek(new Date()));

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      1,
    );
    const gridStart = startOfWeek(firstOfMonth);
    const rows: Date[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + w * 7 + i);
        row.push(d);
      }
      if (row.some((d) => d.getMonth() === viewMonth.getMonth())) {
        rows.push(row);
      }
    }
    return rows;
  }, [viewMonth]);

  const commitWeek = (weekStart: Date) => {
    onValueChange(toIso(weekStart));
    setOpen(false);
  };

  const handlePreset = (weeksOffset: number) => {
    const target = startOfWeek(addWeeks(new Date(), weeksOffset));
    setViewMonth(new Date(target.getFullYear(), target.getMonth(), 1));
    commitWeek(target);
  };

  const goPrev = () =>
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
    );
  const goNext = () =>
    setViewMonth(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
    );

  const displayValue = (() => {
    const start = parseIso(value);
    if (!start) return "Pick a week";
    const ws = startOfWeek(start);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${fmt(ws)} – ${fmt(we)}`;
  })();

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          const anchor = parseIso(value) ?? new Date();
          setViewMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
          setHoveredWeekStart(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 justify-between gap-2 font-normal", className)}
        >
          <span className="truncate">{displayValue}</span>
          <CalendarIcon className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-auto gap-2 p-2">
        {/* Preset shortcuts */}
        <div className="flex flex-col gap-0.5 border-r pr-2">
          {PRESETS.map((p) => {
            const presetWeekStart = toIso(
              startOfWeek(addWeeks(new Date(), p.weeksOffset)),
            );
            const isActive = presetWeekStart === selectedWeekStart;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePreset(p.weeksOffset)}
                className={cn(
                  "rounded-md px-2 py-1 text-left text-xs transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary font-medium"
                    : "hover:bg-muted text-foreground",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Calendar */}
        <div>
          <div className="flex items-center justify-between pb-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={goPrev}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium">
              {viewMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={goNext}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="mb-0.5 grid grid-cols-7">
            {WEEKDAY_LETTERS.map((l, i) => (
              <span
                key={i}
                className="text-muted-foreground flex h-6 w-7 items-center justify-center text-[10px] font-medium"
              >
                {l}
              </span>
            ))}
          </div>

          <div className="space-y-0.5">
            {weeks.map((week) => {
              const weekStartIso = toIso(week[0]);
              const isSelected = weekStartIso === selectedWeekStart;
              const isHovered = weekStartIso === hoveredWeekStart;
              const isThisWeek = weekStartIso === thisWeekStart;
              return (
                <button
                  key={weekStartIso}
                  type="button"
                  onClick={() => commitWeek(week[0])}
                  onMouseEnter={() => setHoveredWeekStart(weekStartIso)}
                  onMouseLeave={() => setHoveredWeekStart(null)}
                  className={cn(
                    "grid w-full grid-cols-7 rounded-full outline-none transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isHovered
                        ? "bg-muted"
                        : isThisWeek
                          ? "ring-primary/40 ring-1 ring-inset"
                          : "",
                  )}
                >
                  {week.map((d) => {
                    const isOtherMonth = d.getMonth() !== viewMonth.getMonth();
                    const isToday = toIso(d) === todayIso;
                    return (
                      <span
                        key={d.getTime()}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center text-xs",
                          !isSelected &&
                            isOtherMonth &&
                            "text-muted-foreground/40",
                          !isSelected &&
                            isToday &&
                            "text-primary font-semibold",
                        )}
                      >
                        {d.getDate()}
                      </span>
                    );
                  })}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type ISODateString = string; // YYYY-MM-DD

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODateString(date: Date): ISODateString {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseISODateString(value: string | undefined | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((p) => Number(p));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  // Guard against invalid dates like 2025-02-31
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date) {
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return aa < bb;
}

function isAfterDay(a: Date, b: Date) {
  const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return aa > bb;
}

function getMonthGrid(month: Date): (Date | null)[][] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);

  const grid: (Date | null)[][] = [];
  let week: (Date | null)[] = [];

  // Sunday = 0
  for (let i = 0; i < first.getDay(); i++) week.push(null);

  for (let day = 1; day <= last.getDate(); day++) {
    week.push(new Date(month.getFullYear(), month.getMonth(), day));
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
  }

  if (week.length) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }

  // Keep height stable (max 6 rows)
  while (grid.length < 6) {
    grid.push(new Array(7).fill(null));
  }

  return grid;
}

export interface DatePickerProps {
  value?: ISODateString;
  onValueChange: (next: ISODateString | "") => void;
  placeholder?: string;
  min?: ISODateString;
  max?: ISODateString;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onValueChange,
  placeholder = "Select date",
  min,
  max,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => parseISODateString(value), [value]);
  const minDate = React.useMemo(() => parseISODateString(min), [min]);
  const maxDate = React.useMemo(() => parseISODateString(max), [max]);

  const [month, setMonth] = React.useState<Date>(() => selectedDate ?? new Date());

  React.useEffect(() => {
    // When external value changes, keep the calendar month aligned to selection.
    if (selectedDate) setMonth(selectedDate);
  }, [selectedDate]);

  const monthLabel = month.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const grid = React.useMemo(() => getMonthGrid(month), [month]);

  const isDisabledDate = React.useCallback(
    (d: Date) => {
      if (minDate && isBeforeDay(d, minDate)) return true;
      if (maxDate && isAfterDay(d, maxDate)) return true;
      return false;
    },
    [minDate, maxDate],
  );

  const selectDate = (d: Date) => {
    if (isDisabledDate(d)) return;
    onValueChange(toISODateString(d));
    setOpen(false);
  };

  const goPrevMonth = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goNextMonth = () =>
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const handleToday = () => {
    const today = new Date();
    setMonth(today);
    selectDate(today);
  };

  const handleClear = () => {
    onValueChange("");
    setOpen(false);
  };

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !displayValue && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[320px] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goPrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={goNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-sm font-semibold">{monthLabel}</div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setMonth(new Date())}
          >
            Today
          </Button>
        </div>

        <div className="mt-2 rounded-md border p-2">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 space-y-1">
            {grid.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((d, di) => {
                  if (!d) return <div key={di} className="h-9 w-9" />;

                  const today = new Date();
                  const selected = selectedDate && isSameDay(d, selectedDate);
                  const isToday = isSameDay(d, today);
                  const disabledCell = isDisabledDate(d);

                  return (
                    <button
                      key={di}
                      type="button"
                      disabled={disabledCell}
                      onClick={() => selectDate(d)}
                      className={cn(
                        "h-9 w-9 rounded-md text-sm transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
                        selected && "bg-primary text-primary-foreground hover:bg-primary",
                        !selected && isToday && "ring-2 ring-primary/50",
                      )}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-2"
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button type="button" size="sm" className="px-2" onClick={handleToday}>
            Set Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}


"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
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
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export interface DatePickerProps {
  id?: string;
  autoFocus?: boolean;
  value?: ISODateString;
  onValueChange: (next: ISODateString | "") => void;
  placeholder?: string;
  min?: ISODateString;
  max?: ISODateString;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  id,
  autoFocus,
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

  const withinLimits = React.useCallback(
    (date: Date) => {
      const normalized = startOfDay(date);
      if (minDate && normalized < startOfDay(minDate)) return false;
      if (maxDate && normalized > startOfDay(maxDate)) return false;
      return true;
    },
    [minDate, maxDate],
  );

  const handleQuickSelect = (date: Date) => {
    if (!withinLimits(date)) return;
    onValueChange(toISODateString(date));
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange("");
    setOpen(false);
  };

  const handleSelectionChange = (dates: Date[]) => {
    if (dates.length === 0) {
      onValueChange("");
      setOpen(false);
      return;
    }
    onValueChange(toISODateString(dates[0]));
    setOpen(false);
  };

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "";

  const quickPresets = [
    { label: "Today", date: startOfDay(new Date()) },
    { label: "Tomorrow", date: startOfDay(addDays(new Date(), 1)) },
    { label: "In 7 Days", date: startOfDay(addDays(new Date(), 7)) },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          autoFocus={autoFocus}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between border-slate-200 bg-white/90 px-3 text-left font-normal text-slate-900 shadow-xs hover:bg-slate-50",
            !displayValue && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <CalendarIcon className="ml-2 size-4 text-sky-600" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[380px] overflow-hidden border-slate-200 p-0"
      >
        <div className="border-b border-slate-200 bg-linear-to-r from-sky-50 via-white to-indigo-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold tracking-wider text-sky-700 uppercase">
            Choose Date
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-700">
            {displayValue || "No date selected"}
          </p>
        </div>

        <div className="space-y-2.5 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {quickPresets.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                disabled={!withinLimits(preset.date)}
                className="h-7 rounded-full border-slate-200 bg-white text-[11px] text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                onClick={() => handleQuickSelect(preset.date)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <DateSelectionCalendar
            mode="single"
            selectedDates={selectedDate ? [selectedDate] : []}
            onSelectionChange={handleSelectionChange}
            showTimeSelection={false}
            minDate={minDate ?? undefined}
            maxDate={maxDate ?? undefined}
            initialMonth={selectedDate ?? new Date()}
            className="rounded-lg border border-slate-200/80 bg-white p-2"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            {(value ?? "").length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 border-slate-200 bg-white text-xs"
                onClick={handleClear}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

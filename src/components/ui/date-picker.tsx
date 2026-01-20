"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
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

      <PopoverContent align="start" className="w-[360px] p-3">
        <DateSelectionCalendar
          mode="single"
          selectedDates={selectedDate ? [selectedDate] : []}
          onSelectionChange={handleSelectionChange}
          showTimeSelection={false}
          minDate={minDate ?? undefined}
          maxDate={maxDate ?? undefined}
          initialMonth={selectedDate ?? new Date()}
        />

        <div className="mt-2 flex items-center justify-end gap-2">
          {(value ?? "").length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


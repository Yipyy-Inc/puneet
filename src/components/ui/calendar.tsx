"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type CalendarMode = "single" | "multiple" | "range";

export interface CalendarProps {
  mode?: CalendarMode;
  selected?: Date | Date[];
  onSelect?: (date: Date | undefined) => void;
  initialFocus?: boolean;
  className?: string;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODateString(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseTypedDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    const dt = new Date(year, month - 1, day);
    if (
      dt.getFullYear() === year &&
      dt.getMonth() === month - 1 &&
      dt.getDate() === day
    ) {
      return dt;
    }
    return null;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    const dt = new Date(year, month - 1, day);
    if (
      dt.getFullYear() === year &&
      dt.getMonth() === month - 1 &&
      dt.getDate() === day
    ) {
      return dt;
    }
    return null;
  }

  return null;
}

export function Calendar({
  mode: _mode = "single",
  selected,
  onSelect,
  className,
}: CalendarProps) {
  const selectedDate = selected instanceof Date ? selected : null;
  const [currentMonth, setCurrentMonth] = React.useState(
    selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [manualDateInput, setManualDateInput] = React.useState(
    selectedDate ? toISODateString(selectedDate) : "",
  );
  const [manualInputError, setManualInputError] = React.useState("");

  const today = new Date();

  React.useEffect(() => {
    if (!selectedDate) {
      setManualDateInput("");
      return;
    }
    setCurrentMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
    setManualDateInput(toISODateString(selectedDate));
    setManualInputError("");
  }, [selectedDate]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days: (Date | null)[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
    );
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const handleDateClick = (date: Date) => {
    setManualDateInput(toISODateString(date));
    setManualInputError("");
    if (onSelect) {
      onSelect(date);
    }
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const year = Number(event.target.value);
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const month = Number(event.target.value);
    setCurrentMonth(new Date(currentMonth.getFullYear(), month, 1));
  };

  const handleManualApply = () => {
    const parsed = parseTypedDateInput(manualDateInput);
    if (!parsed) {
      setManualInputError("Use YYYY-MM-DD or MM/DD/YYYY");
      return;
    }
    setManualInputError("");
    setCurrentMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    onSelect?.(parsed);
  };

  const isToday = (date: Date) => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const monthNames = [
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

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const currentYear = new Date().getFullYear();
  const yearOptions = React.useMemo(() => {
    const selectedYear = selectedDate?.getFullYear() ?? currentYear;
    const startYear = Math.min(selectedYear - 30, currentYear - 30);
    const endYear = Math.max(selectedYear + 10, currentYear + 10);
    return Array.from(
      { length: endYear - startYear + 1 },
      (_, index) => startYear + index,
    );
  }, [currentYear, selectedDate]);

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-linear-to-br from-sky-50/70 via-white to-indigo-50/40 p-3 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200/80 bg-white/80 px-2 py-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          className="size-7 rounded-full text-slate-600 hover:bg-sky-100 hover:text-sky-700"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-1">
          <select
            value={currentMonth.getFullYear()}
            onChange={handleYearChange}
            className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-medium text-slate-700"
            aria-label="Select year"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={currentMonth.getMonth()}
            onChange={handleMonthChange}
            className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-medium text-slate-700"
            aria-label="Select month"
          >
            {monthNames.map((monthName, monthIndex) => (
              <option key={monthName} value={monthIndex}>
                {monthName}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="size-7 rounded-full text-slate-600 hover:bg-sky-100 hover:text-sky-700"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="mb-2 rounded-lg border border-slate-200 bg-white/80 p-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={manualDateInput}
            onChange={(event) => {
              setManualDateInput(event.target.value);
              if (manualInputError) setManualInputError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleManualApply();
              }
            }}
            placeholder="YYYY-MM-DD or MM/DD/YYYY"
            className={cn(
              "h-8 flex-1 rounded-md border px-2 text-xs outline-none",
              "focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-200",
              manualInputError.length > 0
                ? "border-rose-300 text-rose-700"
                : "border-slate-200 text-slate-700",
            )}
            aria-label="Type date manually"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={handleManualApply}
          >
            Go
          </Button>
        </div>
        {manualInputError.length > 0 && (
          <p className="mt-1 text-[10px] text-rose-600">{manualInputError}</p>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {dayNames.map((day) => (
          <div
            key={day}
            className="p-1 text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase"
          >
            {day}
          </div>
        ))}
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="size-9" />;
          }
          return (
            <button
              type="button"
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              className={cn(
                "size-9 rounded-full text-sm font-medium text-slate-700 transition-colors",
                "hover:bg-sky-100 hover:text-sky-700",
                isToday(date) && "ring-2 ring-sky-300",
                isSelected(date) &&
                  "bg-sky-600 text-white hover:bg-sky-600 hover:text-white",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

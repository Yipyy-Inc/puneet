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

export function Calendar({
  mode: _mode = "single",
  selected,
  onSelect,
  className,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selected instanceof Date
      ? new Date(selected.getFullYear(), selected.getMonth(), 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );

  const today = new Date();
  const selectedDate = selected instanceof Date ? selected : null;

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
    if (onSelect) {
      onSelect(date);
    }
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

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-linear-to-br from-sky-50/70 via-white to-indigo-50/40 p-3 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200/80 bg-white/80 px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePreviousMonth}
          className="size-7 rounded-full text-slate-600 hover:bg-sky-100 hover:text-sky-700"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="text-sm font-semibold text-slate-700">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextMonth}
          className="size-7 rounded-full text-slate-600 hover:bg-sky-100 hover:text-sky-700"
        >
          <ChevronRight className="size-4" />
        </Button>
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

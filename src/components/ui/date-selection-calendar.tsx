"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TimeRangeSlider } from "@/components/ui/time-range-slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
export type SelectionMode = "single" | "multi" | "range" | "recurring";

export interface DateTimeInfo {
  date: string; // ISO date string (YYYY-MM-DD)
  checkInTime: string; // HH:mm format
  checkOutTime: string; // HH:mm format
}

export interface RecurringPattern {
  frequency: "weekly";
  daysOfWeek: number[]; // 0 = Sunday, 6 = Saturday
  startDate: Date;
  endDate?: Date;
}

export interface DateSelectionCalendarProps {
  // Selection mode
  mode: SelectionMode;

  // Controlled state for multi and single modes
  selectedDates?: Date[];
  onSelectionChange?: (dates: Date[]) => void;

  // For range mode
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  onRangeChange?: (start: Date | null, end: Date | null) => void;

  // For recurring mode
  recurringPattern?: RecurringPattern;
  onRecurringChange?: (pattern: RecurringPattern | null) => void;

  // Time selection
  showTimeSelection?: boolean;
  dateTimes?: DateTimeInfo[];
  onDateTimesChange?: (dateTimes: DateTimeInfo[]) => void;
  defaultCheckInTime?: string;
  defaultCheckOutTime?: string;

  // Facility hours for time constraints
  facilityHours?: Record<
    string,
    { isOpen: boolean; openTime: string; closeTime: string }
  >;
  /** One-day schedule overrides: custom open/close for specific dates (key = YYYY-MM-DD). */
  scheduleTimeOverrides?: Array<{
    date: string;
    openTime: string;
    closeTime: string;
  }>;
  /** Drop-off and pick-up windows per date (key = YYYY-MM-DD). When set, time selection uses these instead of facility open/close. */
  dropOffPickUpWindowsByDate?: Record<
    string,
    {
      dropOffStart: string;
      dropOffEnd: string;
      pickUpStart: string;
      pickUpEnd: string;
    }
  >;

  // Booking rules for date constraints
  bookingRules?: {
    minimumAdvanceBooking: number; // hours
    maximumAdvanceBooking: number; // days
  };

  // Constraints
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  /** Range mode: dates that cannot be used as check-in (range start). */
  disabledStartDates?: Date[];
  /** Range mode: dates that cannot be used as check-out (range end). */
  disabledEndDates?: Date[];
  /** Messages for disabled dates (key = YYYY-MM-DD). Shown when customer hovers over a blocked date. */
  disabledDateMessages?: Record<string, string>;
  unavailableDates?: Date[];

  /**
   * Enables appointment-specific availability logic (closed days, unavailable slots,
   * holidays, and "Next available" hint). Set to false for generic date fields
   * like birthday or vaccine expiry.
   */
  enableAvailabilityRules?: boolean;

  // Optional features
  showSummary?: boolean;
  showPricing?: boolean;
  pricePerDay?: number;
  priceLabel?: string; // e.g., "per night" or "per day"

  /** Recurring holidays — auto-blocked every year. Each entry has month (1-12) and day. */
  holidays?: Array<{ month: number; day: number; name: string }>;

  // Styling
  className?: string;

  // Optional: set the initial visible month (useful for compact date pickers)
  initialMonth?: Date;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAYS_OF_WEEK_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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

// Helper to format date without timezone issues
const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to get default times based on facility hours
const getDefaultTimes = (
  facilityHours?: Record<
    string,
    { isOpen: boolean; openTime: string; closeTime: string }
  >,
) => {
  if (!facilityHours) return { checkIn: "08:00", checkOut: "17:00" };

  const today = new Date();
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const dayName = days[today.getDay()];
  const hours = facilityHours[dayName];

  if (hours?.isOpen) {
    return { checkIn: hours.openTime, checkOut: hours.closeTime };
  }

  return { checkIn: "08:00", checkOut: "17:00" };
};

export function DateSelectionCalendar({
  mode,
  selectedDates = [],
  onSelectionChange,
  rangeStart,
  rangeEnd,
  onRangeChange,
  recurringPattern,
  onRecurringChange,
  showTimeSelection = false,
  dateTimes = [],
  onDateTimesChange,
  defaultCheckInTime,
  defaultCheckOutTime,
  facilityHours,
  scheduleTimeOverrides,
  dropOffPickUpWindowsByDate,
  bookingRules,
  minDate,
  maxDate,
  disabledDates = [],
  disabledStartDates,
  disabledEndDates,
  disabledDateMessages,
  unavailableDates = [],
  enableAvailabilityRules = true,
  holidays = [],
  className,
  initialMonth,
}: DateSelectionCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(
    () => initialMonth ?? new Date(),
  );
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!initialMonth) return;
    setCurrentMonth(initialMonth);
  }, [initialMonth]);

  // Compute effective default times
  const effectiveDefaultCheckInTime =
    defaultCheckInTime || getDefaultTimes(facilityHours).checkIn;
  const effectiveDefaultCheckOutTime =
    defaultCheckOutTime || getDefaultTimes(facilityHours).checkOut;

  // Get facility hours for a specific date (one-day override takes precedence)
  const getFacilityHoursForDate = (date: Date) => {
    const dateStr = formatDateString(date);
    const override = scheduleTimeOverrides?.find((o) => o.date === dateStr);
    if (override) {
      return {
        isOpen: true,
        openTime: override.openTime,
        closeTime: override.closeTime,
      };
    }
    if (!facilityHours) return null;
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayName = days[date.getDay()];
    return facilityHours[dayName];
  };

  const getDropOffPickUpForDate = (date: Date) => {
    if (!dropOffPickUpWindowsByDate) return null;
    return dropOffPickUpWindowsByDate[formatDateString(date)] ?? null;
  };

  // Utility functions
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const isDateInRange = (date: Date, start: Date, end: Date): boolean => {
    const time = date.getTime();
    return time >= start.getTime() && time <= end.getTime();
  };

  // Compute effective min/max dates based on booking rules
  const effectiveMinDate = useMemo(() => {
    const now = new Date();
    let min = minDate;
    if (bookingRules?.minimumAdvanceBooking) {
      const minAdvance = new Date(
        now.getTime() + bookingRules.minimumAdvanceBooking * 60 * 60 * 1000,
      );
      min = min ? (min > minAdvance ? min : minAdvance) : minAdvance;
    }
    return min;
  }, [minDate, bookingRules]);

  const effectiveMaxDate = useMemo(() => {
    const now = new Date();
    let max = maxDate;
    if (bookingRules?.maximumAdvanceBooking) {
      const maxAdvance = new Date(
        now.getTime() +
          bookingRules.maximumAdvanceBooking * 24 * 60 * 60 * 1000,
      );
      max = max ? (max < maxAdvance ? max : maxAdvance) : maxAdvance;
    }
    return max;
  }, [maxDate, bookingRules]);

  const effectiveDisabledDates = useMemo(() => {
    if (mode === "range") {
      if (rangeStart && !rangeEnd) {
        return [...(disabledDates ?? []), ...(disabledEndDates ?? [])];
      }
      return [...(disabledDates ?? []), ...(disabledStartDates ?? [])];
    }
    return disabledDates ?? [];
  }, [
    mode,
    rangeStart,
    rangeEnd,
    disabledDates,
    disabledStartDates,
    disabledEndDates,
  ]);

  // #4 — check if date is a recurring holiday
  const getHolidayName = (date: Date): string | null => {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const match = holidays.find((h) => h.month === m && h.day === d);
    return match?.name ?? null;
  };

  const isDateDisabled = (date: Date): boolean => {
    if (effectiveMinDate && date < effectiveMinDate) return true;
    if (effectiveMaxDate && date > effectiveMaxDate) return true;
    if (
      enableAvailabilityRules &&
      facilityHours &&
      !getFacilityHoursForDate(date)?.isOpen
    )
      return true;
    if (enableAvailabilityRules && getHolidayName(date)) return true;
    return effectiveDisabledDates.some((d) => isSameDay(d, date));
  };

  // #2 — generate tooltip for disabled dates
  const getDisabledReason = (date: Date): string | undefined => {
    // Check user-provided messages first
    const userMsg = disabledDateMessages?.[formatDateString(date)];
    if (userMsg) return userMsg;
    // Holiday
    const holiday = enableAvailabilityRules ? getHolidayName(date) : null;
    if (holiday) return `Closed — ${holiday}`;
    // Facility closed
    if (
      enableAvailabilityRules &&
      facilityHours &&
      !getFacilityHoursForDate(date)?.isOpen
    )
      return "Facility closed";
    // Before minimum advance
    if (effectiveMinDate && date < effectiveMinDate)
      return "Too soon — advance booking required";
    // After maximum advance
    if (effectiveMaxDate && date > effectiveMaxDate)
      return "Too far in advance";
    return undefined;
  };

  const isDateUnavailable = (date: Date): boolean => {
    if (!enableAvailabilityRules) return false;
    return unavailableDates.some((d) => isSameDay(d, date));
  };

  const isDateSelected = (date: Date): boolean => {
    if (mode === "range") {
      if (!rangeStart) return false;
      if (!rangeEnd) return isSameDay(date, rangeStart);
      return isDateInRange(date, rangeStart, rangeEnd);
    } else if (mode === "recurring") {
      if (!recurringPattern) return false;
      const dayOfWeek = date.getDay();
      return recurringPattern.daysOfWeek.includes(dayOfWeek);
    } else {
      return selectedDates.some((d) => isSameDay(d, date));
    }
  };

  const isToday = (date: Date): boolean => {
    return isSameDay(date, new Date());
  };

  // Calendar generation
  const getMonthCalendarGrid = (date: Date): (Date | null)[][] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstDayOfWeek = firstDay.getDay();
    const grid: (Date | null)[][] = [];
    let week: (Date | null)[] = [];

    // Add padding for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      week.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      week.push(new Date(year, month, day));
      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
    }

    // Add padding for days after month ends
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      grid.push(week);
    }

    return grid;
  };

  const monthGrid = useMemo(
    () => getMonthCalendarGrid(currentMonth),
    [currentMonth],
  );

  const minYear = effectiveMinDate
    ? effectiveMinDate.getFullYear()
    : new Date().getFullYear() - 40;
  const maxYear = effectiveMaxDate
    ? effectiveMaxDate.getFullYear()
    : new Date().getFullYear() + 10;

  const yearOptions = useMemo(() => {
    const start = Math.min(minYear, maxYear, currentMonth.getFullYear());
    const end = Math.max(minYear, maxYear, currentMonth.getFullYear());
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentMonth, maxYear, minYear]);

  const isMonthWithinBounds = (year: number, month: number): boolean => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    if (effectiveMinDate && lastDayOfMonth < effectiveMinDate) {
      return false;
    }

    if (effectiveMaxDate && firstDayOfMonth > effectiveMaxDate) {
      return false;
    }

    return true;
  };

  const clampMonthForYear = (year: number, month: number) => {
    let nextMonth = month;

    if (effectiveMinDate && year === effectiveMinDate.getFullYear()) {
      nextMonth = Math.max(nextMonth, effectiveMinDate.getMonth());
    }

    if (effectiveMaxDate && year === effectiveMaxDate.getFullYear()) {
      nextMonth = Math.min(nextMonth, effectiveMaxDate.getMonth());
    }

    return Math.max(0, Math.min(11, nextMonth));
  };

  // Navigation
  const handlePrevMonth = () => {
    const previousMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1,
    );
    if (
      !isMonthWithinBounds(
        previousMonth.getFullYear(),
        previousMonth.getMonth(),
      )
    ) {
      return;
    }
    setCurrentMonth(previousMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      1,
    );
    if (!isMonthWithinBounds(nextMonth.getFullYear(), nextMonth.getMonth())) {
      return;
    }
    setCurrentMonth(nextMonth);
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const handleYearChange = (value: string) => {
    const selectedYear = Number(value);
    if (!Number.isFinite(selectedYear)) return;
    const clampedMonth = clampMonthForYear(
      selectedYear,
      currentMonth.getMonth(),
    );
    setCurrentMonth(new Date(selectedYear, clampedMonth, 1));
  };

  const handleMonthChange = (value: string) => {
    const selectedMonth = Number(value);
    if (!Number.isFinite(selectedMonth)) return;
    if (!isMonthWithinBounds(currentMonth.getFullYear(), selectedMonth)) {
      return;
    }
    setCurrentMonth(new Date(currentMonth.getFullYear(), selectedMonth, 1));
  };

  const previousMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    1,
  );
  const nextMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    1,
  );
  const canGoToPreviousMonth = isMonthWithinBounds(
    previousMonth.getFullYear(),
    previousMonth.getMonth(),
  );
  const canGoToNextMonth = isMonthWithinBounds(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
  );

  // Selection handlers
  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date) || isDateUnavailable(date)) return;

    if (mode === "single") {
      const isSelected = selectedDates.some((d) => isSameDay(d, date));
      const newDates = isSelected ? [] : [date];
      onSelectionChange?.(newDates);

      // Handle time selection
      if (showTimeSelection && !isSelected) {
        const dateStr = formatDateString(date);
        const dropOffPickUp = getDropOffPickUpForDate(date);
        const facilityHoursForDate = getFacilityHoursForDate(date);
        onDateTimesChange?.([
          {
            date: dateStr,
            checkInTime:
              dropOffPickUp?.dropOffStart ??
              facilityHoursForDate?.openTime ??
              effectiveDefaultCheckInTime,
            checkOutTime:
              dropOffPickUp?.pickUpStart ??
              facilityHoursForDate?.closeTime ??
              effectiveDefaultCheckOutTime,
          },
        ]);
      } else if (showTimeSelection && isSelected) {
        onDateTimesChange?.([]);
      }
    } else if (mode === "multi") {
      const isSelected = selectedDates.some((d) => isSameDay(d, date));
      const dateStr = formatDateString(date);

      if (isSelected) {
        const newDates = selectedDates.filter((d) => !isSameDay(d, date));
        onSelectionChange?.(newDates);

        // Remove time for this date
        if (showTimeSelection) {
          onDateTimesChange?.(dateTimes.filter((dt) => dt.date !== dateStr));
        }
      } else {
        const newDates = [...selectedDates, date];
        onSelectionChange?.(newDates);

        // Add time for this date - use most recent time selection if available
        if (showTimeSelection) {
          const mostRecentTime =
            dateTimes.length > 0 ? dateTimes[dateTimes.length - 1] : null;
          const dropOffPickUp = getDropOffPickUpForDate(date);
          const facilityHoursForDate = getFacilityHoursForDate(date);
          onDateTimesChange?.([
            ...dateTimes,
            {
              date: dateStr,
              checkInTime:
                mostRecentTime?.checkInTime ||
                dropOffPickUp?.dropOffStart ||
                facilityHoursForDate?.openTime ||
                effectiveDefaultCheckInTime,
              checkOutTime:
                mostRecentTime?.checkOutTime ||
                dropOffPickUp?.pickUpStart ||
                facilityHoursForDate?.closeTime ||
                effectiveDefaultCheckOutTime,
            },
          ]);
        }
      }
    } else if (mode === "range") {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start new range
        onRangeChange?.(date, null);

        // Clear times when starting new range
        if (showTimeSelection) {
          onDateTimesChange?.([]);
        }
      } else {
        // Complete range
        const start = date < rangeStart ? date : rangeStart;
        const end = date < rangeStart ? rangeStart : date;
        onRangeChange?.(start, end);

        // Generate times for all dates in range
        if (showTimeSelection) {
          const times: DateTimeInfo[] = [];
          const current = new Date(start);
          while (current <= end) {
            const dropOffPickUp = getDropOffPickUpForDate(current);
            const facilityHoursForDate = getFacilityHoursForDate(current);
            times.push({
              date: formatDateString(current),
              checkInTime:
                dropOffPickUp?.dropOffStart ??
                facilityHoursForDate?.openTime ??
                effectiveDefaultCheckInTime,
              checkOutTime:
                dropOffPickUp?.pickUpStart ??
                facilityHoursForDate?.closeTime ??
                effectiveDefaultCheckOutTime,
            });
            current.setDate(current.getDate() + 1);
          }
          onDateTimesChange?.(times);
        }
      }
    }
    // Recurring mode handled separately via day-of-week toggles
  };

  const handleRecurringDayToggle = (dayOfWeek: number) => {
    const dayName = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][dayOfWeek];
    if (facilityHours && !facilityHours[dayName]?.isOpen) return;

    if (!recurringPattern) {
      onRecurringChange?.({
        frequency: "weekly",
        daysOfWeek: [dayOfWeek],
        startDate: new Date(),
      });
    } else {
      const isSelected = recurringPattern.daysOfWeek.includes(dayOfWeek);
      const newDays = isSelected
        ? recurringPattern.daysOfWeek.filter((d) => d !== dayOfWeek)
        : [...recurringPattern.daysOfWeek, dayOfWeek].sort();

      if (newDays.length === 0) {
        onRecurringChange?.(null);
      } else {
        onRecurringChange?.({
          ...recurringPattern,
          daysOfWeek: newDays,
        });
      }
    }
  };

  const handleRecurringEndDate = (endDate: string) => {
    if (!recurringPattern) return;
    onRecurringChange?.({
      ...recurringPattern,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  };

  const getTimeForDate = (dateStr: string) => {
    return dateTimes.find((dt) => dt.date === dateStr);
  };

  // Render date cell
  const renderDateCell = (date: Date | null) => {
    if (!date) {
      return <div className="aspect-square" />;
    }

    const selected = isDateSelected(date);
    const disabled = isDateDisabled(date);
    const unavailable = isDateUnavailable(date);
    const today = isToday(date);

    // Range-specific styling
    let isRangeStart = false;
    let isRangeEnd = false;
    let isInRange = false;
    let isHoverInRange = false;

    if (mode === "range") {
      isRangeStart = rangeStart ? isSameDay(date, rangeStart) : false;
      isRangeEnd = rangeEnd ? isSameDay(date, rangeEnd) : false;
      isInRange =
        rangeStart && rangeEnd
          ? isDateInRange(date, rangeStart, rangeEnd)
          : false;

      // Hover preview for range
      if (rangeStart && !rangeEnd && hoverDate && !disabled && !unavailable) {
        const previewEnd = hoverDate;
        const previewStart = rangeStart;
        if (previewEnd >= previewStart) {
          isHoverInRange = isDateInRange(date, previewStart, previewEnd);
        }
      }
    }

    // #2 — tooltip for any disabled date
    const disabledReason =
      disabled || unavailable ? getDisabledReason(date) : undefined;

    // #1 — detect reduced/modified hours compared to standard weekday
    const dateHours = !disabled ? getFacilityHoursForDate(date) : null;
    const hasModifiedHours = (() => {
      if (!facilityHours || !dateHours?.isOpen) return false;
      const stdOpen = facilityHours.monday?.openTime;
      const stdClose = facilityHours.monday?.closeTime;
      if (!stdOpen || !stdClose) return false;
      return dateHours.openTime !== stdOpen || dateHours.closeTime !== stdClose;
    })();

    return (
      <button
        type="button"
        onClick={() => handleDateClick(date)}
        onMouseEnter={() => setHoverDate(date)}
        disabled={disabled || unavailable}
        title={
          disabledReason ??
          (hasModifiedHours && dateHours
            ? `Hours: ${dateHours.openTime} – ${dateHours.closeTime}`
            : undefined)
        }
        className={cn(
          `relative m-2 aspect-square w-full rounded-full text-[10px] font-medium transition-colors`,
          "hover:bg-accent hover:text-accent-foreground",
          "disabled:cursor-not-allowed disabled:opacity-40",
          // Selected state
          selected && !isInRange && "bg-primary text-primary-foreground",
          selected && !isInRange && "hover:bg-primary/90",
          // Range styling
          isInRange &&
            !isRangeStart &&
            !isRangeEnd &&
            "bg-primary/20 rounded-none",
          (isRangeStart || isRangeEnd) && "bg-primary text-primary-foreground",
          isRangeStart && !isRangeEnd && "rounded-l-full rounded-r-none",
          isRangeEnd && !isRangeStart && "rounded-l-none rounded-r-full",
          isRangeStart && isRangeEnd && "rounded-full",
          // Hover range preview
          isHoverInRange &&
            !isRangeStart &&
            "border-primary/20 bg-primary/10 rounded-none border",
          // Today
          today && !selected && "border-primary border-2 font-bold",
          // Unavailable
          unavailable && "text-destructive line-through",
        )}
      >
        {date.getDate()}
        {/* #1 — small dot indicator for reduced/modified hours */}
        {hasModifiedHours && !selected && !disabled && (
          <span className="absolute right-0.5 bottom-0.5 size-1 rounded-full bg-amber-400" />
        )}
      </button>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Recurring Pattern Selector */}
      {mode === "recurring" && (
        <div className="bg-muted/30 space-y-2.5 rounded-lg border p-3">
          <Label className="text-sm font-medium">Select Days of Week</Label>
          <div className="grid grid-cols-7 gap-2">
            {DAYS_OF_WEEK_FULL.map((day, index) => {
              const dayName = [
                "sunday",
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
              ][index];
              const isClosed = facilityHours && !facilityHours[dayName]?.isOpen;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleRecurringDayToggle(index)}
                  disabled={isClosed}
                  className={cn(
                    "rounded-md p-2 text-xs font-medium transition-colors",
                    "border",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    recurringPattern?.daysOfWeek.includes(index)
                      ? "border-primary bg-primary text-primary-foreground"
                      : `border-border bg-background hover:bg-accent`,
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="recurringEndDate">Repeat Until (Optional)</Label>
            <Input
              id="recurringEndDate"
              type="date"
              value={
                recurringPattern?.endDate
                  ? formatDateString(recurringPattern.endDate)
                  : ""
              }
              onChange={(e) => handleRecurringEndDate(e.target.value)}
              min={formatDateString(new Date())}
            />
          </div>
        </div>
      )}

      {/* Calendar Grid and (optional) Time Selection */}
      <div
        className={cn(
          showTimeSelection ? "grid grid-cols-2 gap-4" : "grid grid-cols-1",
        )}
      >
        {/* Calendar Grid Column */}
        <div className="relative">
          {mode !== "recurring" && (
            <>
              {/* Calendar Header - overlaid on calendar */}
              <div className="bg-background/95 absolute top-2 right-2 left-2 z-10 flex flex-wrap items-center justify-between gap-1.5 rounded-md px-2 py-1 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={handlePrevMonth}
                    disabled={!canGoToPreviousMonth}
                  >
                    <ChevronLeft className="size-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={handleNextMonth}
                    disabled={!canGoToNextMonth}
                  >
                    <ChevronRight className="size-3" />
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="text-muted-foreground size-3" />
                  <Select
                    value={String(currentMonth.getFullYear())}
                    onValueChange={handleYearChange}
                  >
                    <SelectTrigger
                      size="sm"
                      className="bg-background h-7 w-[4.8rem] border-slate-200 px-2 text-[11px] font-medium"
                      aria-label="Select year"
                    >
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      className="z-90 max-h-44 min-w-[4.8rem]"
                    >
                      {yearOptions.map((year) => (
                        <SelectItem
                          key={year}
                          value={String(year)}
                          className="text-xs"
                        >
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(currentMonth.getMonth())}
                    onValueChange={handleMonthChange}
                  >
                    <SelectTrigger
                      size="sm"
                      className="bg-background h-7 w-[6.8rem] border-slate-200 px-2 text-[11px] font-medium"
                      aria-label="Select month"
                    >
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      className="z-90 max-h-52 min-w-[6.8rem]"
                    >
                      {MONTH_NAMES.map((monthLabel, monthIndex) => (
                        <SelectItem
                          key={monthLabel}
                          value={String(monthIndex)}
                          disabled={
                            !isMonthWithinBounds(
                              currentMonth.getFullYear(),
                              monthIndex,
                            )
                          }
                          className="text-xs"
                        >
                          {monthLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={handleToday}
                >
                  Today
                </Button>
              </div>
              <div className="rounded-lg border p-2 pt-10">
                {/* Days of week header */}
                <div className="mb-0.5 grid grid-cols-7 gap-0.5">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="text-muted-foreground py-0.5 text-center text-[10px] font-medium"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Date grid */}
                <div
                  className="space-y-0"
                  onMouseLeave={() => setHoverDate(null)}
                >
                  {monthGrid.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-2">
                      {week.map((date, dateIndex) => (
                        <div key={dateIndex}>{renderDateCell(date)}</div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* #5 — Next available date hint */}
                {enableAvailabilityRules &&
                  mode === "single" &&
                  selectedDates.length === 0 &&
                  (() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    for (let i = 0; i < 90; i++) {
                      const candidate = new Date(today);
                      candidate.setDate(today.getDate() + i);
                      if (
                        !isDateDisabled(candidate) &&
                        !isDateUnavailable(candidate)
                      ) {
                        const label = candidate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        });
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentMonth(candidate);
                              handleDateClick(candidate);
                            }}
                            className="text-primary hover:bg-primary/5 mt-1 w-full rounded-md px-2 py-1.5 text-center text-[10px] font-medium transition-colors"
                          >
                            Next available: {label} →
                          </button>
                        );
                      }
                    }
                    return null;
                  })()}
              </div>
            </>
          )}
        </div>

        {/* Time Selection Column */}
        {showTimeSelection && (
          <div className="min-h-[200px] rounded-lg border p-4">
            {(mode === "single" && selectedDates.length > 0) ||
            (mode === "multi" && selectedDates.length > 0) ||
            (mode === "range" && rangeStart && rangeEnd) ? (
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Check-in/out Times
                </Label>

                {mode === "range" &&
                  dateTimes.length > 0 &&
                  rangeStart &&
                  rangeEnd && (
                    <div className="space-y-2 rounded-lg border p-3">
                      <p className="text-xs font-semibold">
                        {rangeStart.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        –{" "}
                        {rangeEnd.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <TimeRangeSlider
                        minTime={
                          getFacilityHoursForDate(rangeStart)?.openTime ||
                          "06:00"
                        }
                        maxTime={
                          getFacilityHoursForDate(rangeEnd)?.closeTime ||
                          "22:00"
                        }
                        dropOffWindow={
                          getDropOffPickUpForDate(rangeStart)
                            ? {
                                min: getDropOffPickUpForDate(rangeStart)!
                                  .dropOffStart,
                                max: getDropOffPickUpForDate(rangeStart)!
                                  .dropOffEnd,
                              }
                            : undefined
                        }
                        pickUpWindow={
                          getDropOffPickUpForDate(rangeEnd)
                            ? {
                                min: getDropOffPickUpForDate(rangeEnd)!
                                  .pickUpStart,
                                max: getDropOffPickUpForDate(rangeEnd)!
                                  .pickUpEnd,
                              }
                            : undefined
                        }
                        startTime={
                          dateTimes[0]?.checkInTime ||
                          effectiveDefaultCheckInTime
                        }
                        endTime={
                          dateTimes[0]?.checkOutTime ||
                          effectiveDefaultCheckOutTime
                        }
                        onTimeChange={(start, end) => {
                          const newTimes = dateTimes.map((dt) => ({
                            ...dt,
                            checkInTime: start,
                            checkOutTime: end,
                          }));
                          onDateTimesChange?.(newTimes);
                        }}
                        onApply={() => {}}
                        step={30}
                      />
                      <p className="text-muted-foreground text-[10px]">
                        Same times for all days in range
                      </p>
                    </div>
                  )}

                {mode === "single" &&
                  dateTimes.length > 0 &&
                  selectedDates[0] && (
                    <div className="space-y-2 rounded-lg border p-3">
                      <p className="text-xs font-semibold">
                        {selectedDates[0].toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <TimeRangeSlider
                        minTime={
                          getFacilityHoursForDate(selectedDates[0])?.openTime ||
                          "06:00"
                        }
                        maxTime={
                          getFacilityHoursForDate(selectedDates[0])
                            ?.closeTime || "22:00"
                        }
                        dropOffWindow={
                          getDropOffPickUpForDate(selectedDates[0])
                            ? {
                                min: getDropOffPickUpForDate(selectedDates[0])!
                                  .dropOffStart,
                                max: getDropOffPickUpForDate(selectedDates[0])!
                                  .dropOffEnd,
                              }
                            : undefined
                        }
                        pickUpWindow={
                          getDropOffPickUpForDate(selectedDates[0])
                            ? {
                                min: getDropOffPickUpForDate(selectedDates[0])!
                                  .pickUpStart,
                                max: getDropOffPickUpForDate(selectedDates[0])!
                                  .pickUpEnd,
                              }
                            : undefined
                        }
                        startTime={
                          dateTimes[0]?.checkInTime ||
                          effectiveDefaultCheckInTime
                        }
                        endTime={
                          dateTimes[0]?.checkOutTime ||
                          effectiveDefaultCheckOutTime
                        }
                        onTimeChange={(start, end) => {
                          const newTimes = dateTimes.map((dt) => ({
                            ...dt,
                            checkInTime: start,
                            checkOutTime: end,
                          }));
                          onDateTimesChange?.(newTimes);
                        }}
                        onApply={() => {}}
                        step={30}
                      />
                    </div>
                  )}

                {mode === "multi" && (
                  <div className="space-y-3">
                    {[...selectedDates]
                      .sort((a, b) => a.getTime() - b.getTime())
                      .map((date, index) => {
                        const dateStr = formatDateString(date);
                        const timeInfo = getTimeForDate(dateStr);

                        return (
                          <div
                            key={index}
                            className="space-y-2 rounded-lg border p-3"
                          >
                            <p className="text-xs font-semibold">
                              {date.toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            {timeInfo && (
                              <>
                                <TimeRangeSlider
                                  minTime={
                                    getFacilityHoursForDate(date)?.openTime ||
                                    "06:00"
                                  }
                                  maxTime={
                                    getFacilityHoursForDate(date)?.closeTime ||
                                    "22:00"
                                  }
                                  dropOffWindow={
                                    getDropOffPickUpForDate(date)
                                      ? {
                                          min: getDropOffPickUpForDate(date)!
                                            .dropOffStart,
                                          max: getDropOffPickUpForDate(date)!
                                            .dropOffEnd,
                                        }
                                      : undefined
                                  }
                                  pickUpWindow={
                                    getDropOffPickUpForDate(date)
                                      ? {
                                          min: getDropOffPickUpForDate(date)!
                                            .pickUpStart,
                                          max: getDropOffPickUpForDate(date)!
                                            .pickUpEnd,
                                        }
                                      : undefined
                                  }
                                  startTime={timeInfo.checkInTime}
                                  endTime={timeInfo.checkOutTime}
                                  onTimeChange={(start, end) => {
                                    const updatedTimes = dateTimes.map((dt) =>
                                      dt.date === dateStr
                                        ? {
                                            ...dt,
                                            checkInTime: start,
                                            checkOutTime: end,
                                          }
                                        : dt,
                                    );
                                    onDateTimesChange?.(updatedTimes);
                                  }}
                                  onApply={() => {}}
                                  onApplyToAll={() => {
                                    const currentTime = getTimeForDate(dateStr);
                                    if (currentTime) {
                                      const updatedTimes = dateTimes.map(
                                        (dt) => ({
                                          ...dt,
                                          checkInTime: currentTime.checkInTime,
                                          checkOutTime:
                                            currentTime.checkOutTime,
                                        }),
                                      );
                                      onDateTimesChange?.(updatedTimes);
                                    }
                                  }}
                                  step={30}
                                />
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground text-center">
                <Clock className="mx-auto mb-2 size-8 opacity-50" />
                <p className="text-sm">
                  Select dates to set check-in/out times
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

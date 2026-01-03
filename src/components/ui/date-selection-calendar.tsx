"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TimeRangeSlider } from "@/components/ui/time-range-slider";
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

  // Booking rules for date constraints
  bookingRules?: {
    minimumAdvanceBooking: number; // hours
    maximumAdvanceBooking: number; // days
  };

  // Constraints
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  unavailableDates?: Date[];

  // Optional features
  showSummary?: boolean;
  showPricing?: boolean;
  pricePerDay?: number;
  priceLabel?: string; // e.g., "per night" or "per day"

  // Styling
  className?: string;
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
  bookingRules,
  minDate,
  maxDate,
  disabledDates = [],
  unavailableDates = [],
  className,
}: DateSelectionCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Compute effective default times
  const effectiveDefaultCheckInTime =
    defaultCheckInTime || getDefaultTimes(facilityHours).checkIn;
  const effectiveDefaultCheckOutTime =
    defaultCheckOutTime || getDefaultTimes(facilityHours).checkOut;

  // Get facility hours for a specific date
  const getFacilityHoursForDate = (date: Date) => {
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

  const isDateDisabled = (date: Date): boolean => {
    if (effectiveMinDate && date < effectiveMinDate) return true;
    if (effectiveMaxDate && date > effectiveMaxDate) return true;
    if (facilityHours && !getFacilityHoursForDate(date)?.isOpen) return true;
    return disabledDates.some((d) => isSameDay(d, date));
  };

  const isDateUnavailable = (date: Date): boolean => {
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

  // Navigation
  const handlePrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

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
        const facilityHoursForDate = getFacilityHoursForDate(date);
        onDateTimesChange?.([
          {
            date: dateStr,
            checkInTime:
              facilityHoursForDate?.openTime || effectiveDefaultCheckInTime,
            checkOutTime:
              facilityHoursForDate?.closeTime || effectiveDefaultCheckOutTime,
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
          const facilityHoursForDate = getFacilityHoursForDate(date);
          onDateTimesChange?.([
            ...dateTimes,
            {
              date: dateStr,
              checkInTime:
                mostRecentTime?.checkInTime ||
                facilityHoursForDate?.openTime ||
                effectiveDefaultCheckInTime,
              checkOutTime:
                mostRecentTime?.checkOutTime ||
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
            const facilityHoursForDate = getFacilityHoursForDate(current);
            times.push({
              date: formatDateString(current),
              checkInTime:
                facilityHoursForDate?.openTime || effectiveDefaultCheckInTime,
              checkOutTime:
                facilityHoursForDate?.closeTime || effectiveDefaultCheckOutTime,
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

    return (
      <button
        type="button"
        onClick={() => handleDateClick(date)}
        onMouseEnter={() => setHoverDate(date)}
        onMouseLeave={() => setHoverDate(null)}
        disabled={disabled || unavailable}
        className={cn(
          "aspect-square w-full m-2 text-[10px] font-medium transition-all relative rounded-full",
          "hover:bg-accent hover:text-accent-foreground",
          "disabled:opacity-40 disabled:cursor-not-allowed",
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
          isRangeEnd && !isRangeStart && "rounded-r-full rounded-l-none",
          isRangeStart && isRangeEnd && "rounded-full",
          // Hover range preview
          isHoverInRange &&
            !isRangeStart &&
            "bg-primary/10 border border-primary/20 rounded-none",
          // Today
          today && !selected && "border-2 border-primary font-bold",
          // Unavailable
          unavailable && "line-through text-destructive",
        )}
      >
        {date.getDate()}
      </button>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Recurring Pattern Selector */}
      {mode === "recurring" && (
        <div className="space-y-2.5 p-3 border rounded-lg bg-muted/30">
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
                    "p-2 text-xs font-medium rounded-md transition-colors",
                    "border",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    recurringPattern?.daysOfWeek.includes(index)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-accent border-border",
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

      {/* Calendar Grid and Time Selection Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        {/* Calendar Grid Column */}
        <div className="relative">
          {mode !== "recurring" && (
            <>
              {/* Calendar Header - overlaid on calendar */}
              <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between bg-background/95 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handlePrevMonth}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleNextMonth}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-semibold">
                    {currentMonth.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={handleToday}
                >
                  Today
                </Button>
              </div>
              <div className="border rounded-lg p-2 pt-10">
                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                  {DAYS_OF_WEEK.map((day) => (
                    <div
                      key={day}
                      className="text-center text-[10px] font-medium text-muted-foreground py-0.5"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Date grid */}
                <div className="space-y-0">
                  {monthGrid.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-2">
                      {week.map((date, dateIndex) => (
                        <div key={dateIndex}>{renderDateCell(date)}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Time Selection Column */}
        <div className="border rounded-lg p-4 min-h-[200px]">
          {showTimeSelection &&
          ((mode === "single" && selectedDates.length > 0) ||
            (mode === "multi" && selectedDates.length > 0) ||
            (mode === "range" && rangeStart && rangeEnd)) ? (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Check-in/out Times</Label>

              {mode === "range" && dateTimes.length > 0 && (
                <div className="p-2 border rounded-lg space-y-1.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Check-in Time
                      </Label>
                      <Input
                        type="time"
                        value={
                          dateTimes[0]?.checkInTime ||
                          effectiveDefaultCheckInTime
                        }
                        onChange={(e) => {
                          const newTimes = dateTimes.map((dt) => ({
                            ...dt,
                            checkInTime: e.target.value,
                          }));
                          onDateTimesChange?.(newTimes);
                        }}
                        min={
                          facilityHours && rangeStart
                            ? getFacilityHoursForDate(rangeStart)?.openTime ||
                              "06:00"
                            : "06:00"
                        }
                        max={
                          facilityHours && rangeEnd
                            ? getFacilityHoursForDate(rangeEnd)?.closeTime ||
                              "22:00"
                            : "22:00"
                        }
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Check-out Time
                      </Label>
                      <Input
                        type="time"
                        value={
                          dateTimes[0]?.checkOutTime ||
                          effectiveDefaultCheckOutTime
                        }
                        onChange={(e) => {
                          const newTimes = dateTimes.map((dt) => ({
                            ...dt,
                            checkOutTime: e.target.value,
                          }));
                          onDateTimesChange?.(newTimes);
                        }}
                        min={
                          facilityHours && rangeStart
                            ? getFacilityHoursForDate(rangeStart)?.openTime ||
                              "06:00"
                            : "06:00"
                        }
                        max={
                          facilityHours && rangeEnd
                            ? getFacilityHoursForDate(rangeEnd)?.closeTime ||
                              "22:00"
                            : "22:00"
                        }
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Same times for all days in range
                  </p>
                </div>
              )}

              {mode === "single" &&
                dateTimes.length > 0 &&
                selectedDates[0] && (
                  <div className="p-3 border rounded-lg space-y-2">
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
                        getFacilityHoursForDate(selectedDates[0])?.closeTime ||
                        "22:00"
                      }
                      startTime={
                        dateTimes[0]?.checkInTime || effectiveDefaultCheckInTime
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
                          className="p-3 border rounded-lg space-y-2"
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
                                        checkOutTime: currentTime.checkOutTime,
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
            <div className="text-center text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select dates to set check-in/out times</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

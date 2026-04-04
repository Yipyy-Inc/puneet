"use client";

import React from "react";
import { DateSelectionCalendar } from "@/components/ui/date-selection-calendar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  CalendarDays,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const todayString = (): string => formatDateString(new Date());

const nowInMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

const fmtDate = (dateStr: string) => {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
};

const timeToMinutes = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface EvaluationDetailsProps {
  currentSubStep: number;
  startDate: string;
  setStartDate: (date: string) => void;
  checkInTime: string;
  setCheckInTime: (time: string) => void;
  checkOutTime: string;
  setCheckOutTime: (time: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EvaluationDetails({
  currentSubStep,
  startDate,
  setStartDate,
  setCheckInTime,
  setCheckOutTime,
}: EvaluationDetailsProps) {
  const {
    hours,
    rules,
    evaluation,
    serviceDateBlocks,
    scheduleTimeOverrides,
    dropOffPickUpOverrides,
    holidays,
  } = useSettings();

  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);

  const scheduleTimeOverridesForEvaluation = React.useMemo(
    () =>
      scheduleTimeOverrides.filter(
        (o) => !o.services?.length || o.services.includes("evaluation"),
      ),
    [scheduleTimeOverrides],
  );

  const dropOffPickUpWindowsByDateForEvaluation = React.useMemo(() => {
    const map: Record<
      string,
      {
        dropOffStart: string;
        dropOffEnd: string;
        pickUpStart: string;
        pickUpEnd: string;
      }
    > = {};
    dropOffPickUpOverrides
      .filter((o) => o.services.includes("evaluation"))
      .forEach((o) => {
        map[o.date] = {
          dropOffStart: o.dropOffStart,
          dropOffEnd: o.dropOffEnd,
          pickUpStart: o.pickUpStart,
          pickUpEnd: o.pickUpEnd,
        };
      });
    return map;
  }, [dropOffPickUpOverrides]);

  const { blockedDatesForEvaluation, blockedDateMessagesForEvaluation } =
    React.useMemo(() => {
      const blocks = serviceDateBlocks.filter(
        (b) => b.closed && b.services.includes("evaluation"),
      );
      const dates = blocks.map((b) => {
        const [y, m, d] = b.date.split("-").map(Number);
        return new Date(y, m - 1, d);
      });
      const messages: Record<string, string> = {};
      blocks.forEach(
        (b) => b.closureMessage && (messages[b.date] = b.closureMessage),
      );
      return {
        blockedDatesForEvaluation: dates,
        blockedDateMessagesForEvaluation: messages,
      };
    }, [serviceDateBlocks]);

  const durationOptions = evaluation.schedule.durationOptionsMinutes;
  const defaultDuration =
    evaluation.schedule.defaultDurationMinutes ?? durationOptions[0] ?? 60;
  const [selectedDuration, setSelectedDuration] =
    React.useState<number>(defaultDuration);

  const selectedDates = React.useMemo(() => {
    if (!startDate) return [];
    const [year, month, day] = startDate.split("-").map(Number);
    return [new Date(year, month - 1, day)];
  }, [startDate]);

  const dateTimes = React.useMemo(() => [], []);

  const timeWindows = React.useMemo(
    () =>
      evaluation.schedule.timeWindows.length > 0
        ? evaluation.schedule.timeWindows
        : [
            {
              id: "all-day",
              label: "All day",
              startTime: "00:00",
              endTime: "23:59",
            },
          ],
    [evaluation.schedule.timeWindows],
  );

  // All slots for the selected duration
  const slots = React.useMemo(() => {
    const duration = selectedDuration || defaultDuration;
    if (evaluation.schedule.slotMode === "fixed") {
      return evaluation.schedule.fixedStartTimes
        .map((startTime) => {
          const start = timeToMinutes(startTime);
          const end = start + duration;
          const withinWindow = timeWindows.some(
            (w) =>
              start >= timeToMinutes(w.startTime) &&
              end <= timeToMinutes(w.endTime),
          );
          if (!withinWindow) return null;
          return { startTime, endTime: minutesToTime(end), duration };
        })
        .filter(Boolean) as Array<{
        startTime: string;
        endTime: string;
        duration: number;
      }>;
    }

    const generated: Array<{
      startTime: string;
      endTime: string;
      duration: number;
    }> = [];
    timeWindows.forEach((window) => {
      const start = timeToMinutes(window.startTime);
      const end = timeToMinutes(window.endTime);
      let current = start;
      while (current + duration <= end) {
        generated.push({
          startTime: minutesToTime(current),
          endTime: minutesToTime(current + duration),
          duration,
        });
        current += duration;
      }
    });
    return generated;
  }, [evaluation.schedule, selectedDuration, defaultDuration, timeWindows]);

  // #3 — mark slots that are in the past when today is selected
  const isToday = startDate === todayString();
  const currentMinutes = isToday ? nowInMinutes() : -1;
  const slotsWithPast = slots.map((slot) => ({
    ...slot,
    isPast: isToday && timeToMinutes(slot.startTime) <= currentMinutes,
  }));

  // #2 — available (non-past) slot count for the header badge
  const availableCount = slotsWithPast.filter((s) => !s.isPast).length;

  const handleSelectionChange = (dates: Date[]) => {
    if (dates.length > 0) {
      setStartDate(formatDateString(dates[0]));
      setSelectedSlot(null);
      setCheckInTime("");
      setCheckOutTime("");
    } else {
      setStartDate("");
      setCheckInTime("");
      setCheckOutTime("");
      setSelectedSlot(null);
    }
  };

  const handleSlotSelect = (slotStartTime: string) => {
    const slot = slots.find((s) => s.startTime === slotStartTime);
    if (!slot) return;
    setSelectedSlot(slotStartTime);
    setCheckInTime(slot.startTime);
    setCheckOutTime(slot.endTime);
  };

  // #4 — clear date selection to let user pick another
  const handleClearDate = () => {
    handleSelectionChange([]);
  };

  const selectedSlotData = slots.find((s) => s.startTime === selectedSlot);

  return (
    <div className="space-y-5">
      {currentSubStep === 0 && (
        <>
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <ClipboardCheck className="size-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold">Schedule Your Evaluation</h3>
              <p className="text-muted-foreground text-sm">
                {evaluation.description ||
                  "Choose a date and time for your pet's assessment session."}
              </p>
            </div>
          </div>

          {/* ── Two-column layout ─────────────────────────────────────────── */}
          <div className="flex gap-5">
            {/* Left — Calendar (#6: min-w guard) */}
            <div className="min-w-[280px] flex-1">
              <div className="mb-2 flex items-center gap-1.5">
                <CalendarDays className="text-muted-foreground size-3.5" />
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Pick a date
                </p>
              </div>

              {/* #10 — no forced bg-white; let calendar own its background */}
              <div className="overflow-hidden rounded-xl border shadow-sm">
                <DateSelectionCalendar
                  mode="single"
                  selectedDates={selectedDates}
                  onSelectionChange={handleSelectionChange}
                  showTimeSelection={false}
                  dateTimes={dateTimes}
                  facilityHours={hours}
                  scheduleTimeOverrides={scheduleTimeOverridesForEvaluation}
                  dropOffPickUpWindowsByDate={
                    dropOffPickUpWindowsByDateForEvaluation
                  }
                  bookingRules={{
                    minimumAdvanceBooking: rules.minimumAdvanceBooking,
                    maximumAdvanceBooking: rules.maximumAdvanceBooking,
                  }}
                  disabledDates={blockedDatesForEvaluation}
                  disabledDateMessages={blockedDateMessagesForEvaluation}
                  holidays={holidays}
                />
              </div>
            </div>

            {/* Right — Time slot panel */}
            <div className="flex w-56 shrink-0 flex-col">
              {/* Panel header */}
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  Available times
                </p>
                {startDate && availableCount > 0 && (
                  <span className="text-muted-foreground text-[10px] font-medium">
                    {availableCount} slot{availableCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {!startDate ? (
                /* Empty state — minimal, no icons */
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed">
                  <p className="text-muted-foreground px-6 py-12 text-center text-xs/relaxed">
                    Select a date to view times
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {/* Duration selector */}
                  {durationOptions.length > 1 && (
                    <Select
                      value={String(selectedDuration)}
                      onValueChange={(v) => {
                        setSelectedDuration(Number(v));
                        setSelectedSlot(null);
                        setCheckInTime("");
                        setCheckOutTime("");
                      }}
                    >
                      <SelectTrigger className="h-8 w-full text-xs">
                        <SelectValue placeholder="Session length" />
                      </SelectTrigger>
                      <SelectContent>
                        {durationOptions.map((opt) => (
                          <SelectItem key={opt} value={String(opt)}>
                            {opt >= 60
                              ? `${opt / 60}h session`
                              : `${opt} min session`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* No-slots state */}
                  {availableCount === 0 ? (
                    <div className="space-y-3 rounded-lg border px-4 py-8 text-center">
                      <p className="text-sm font-medium">No availability</p>
                      <p className="text-muted-foreground text-xs">
                        {isToday
                          ? "All times have passed for today."
                          : "This date has no open slots."}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={handleClearDate}
                      >
                        <ArrowLeft className="size-3" />
                        Choose another date
                      </Button>
                    </div>
                  ) : (
                    /* Clean vertical schedule list */
                    <div
                      role="radiogroup"
                      aria-label="Available time slots"
                      className="max-h-[360px] overflow-hidden overflow-y-auto rounded-lg border"
                    >
                      {slotsWithPast.map((slot, i) => {
                        const isSelected =
                          selectedSlot === slot.startTime && !slot.isPast;
                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${fmtTime(slot.startTime)} to ${fmtTime(slot.endTime)}${slot.isPast ? ", unavailable" : ""}`}
                            disabled={slot.isPast}
                            onClick={() =>
                              !slot.isPast && handleSlotSelect(slot.startTime)
                            }
                            className={cn(
                              "flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors",
                              i < slotsWithPast.length - 1 && "border-b",
                              slot.isPast
                                ? "cursor-not-allowed opacity-20"
                                : isSelected
                                  ? "bg-foreground text-background"
                                  : "hover:bg-accent",
                            )}
                          >
                            <span
                              className={cn(
                                "font-[tabular-nums] text-sm",
                                isSelected ? "font-semibold" : "font-medium",
                              )}
                            >
                              {fmtTime(slot.startTime)}
                            </span>
                            <span
                              className={cn(
                                "text-[11px]",
                                isSelected
                                  ? "opacity-50"
                                  : "text-muted-foreground",
                              )}
                            >
                              {slot.isPast
                                ? "Unavailable"
                                : fmtTime(slot.endTime)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Summary strip ─────────────────────────────────────────────── */}
          {startDate && selectedSlot && selectedSlotData && (
            <div className="flex items-center gap-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
              <CheckCircle2 className="size-5 shrink-0 text-violet-600" />
              <div className="flex min-w-0 flex-1 flex-wrap gap-x-6 gap-y-0.5">
                <div>
                  <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    Date
                  </p>
                  <p className="text-sm font-semibold text-violet-800">
                    {fmtDate(startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    Time
                  </p>
                  <p className="text-sm font-semibold text-violet-800">
                    {fmtTime(selectedSlotData.startTime)} –{" "}
                    {fmtTime(selectedSlotData.endTime)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                    Duration
                  </p>
                  <p className="text-sm font-semibold text-violet-800">
                    {selectedSlotData.duration} min
                  </p>
                </div>
              </div>
              {/* #8 — continue affordance hint */}
              <p className="text-muted-foreground hidden shrink-0 text-xs sm:block">
                Click <span className="font-semibold">Next</span> to continue →
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

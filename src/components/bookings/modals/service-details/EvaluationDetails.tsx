"use client";

import React from "react";
import Image from "next/image";
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
  Clock,
  Sparkles,
  PawPrint,
  Plus,
  Minus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { useServiceAddOns } from "@/lib/api/facility-settings";
import type { Pet } from "@/types/pet";
import { useShellText, useShellLocale } from "@/lib/shell/use-shell-text";
import { addOnPriceLabel } from "./addon-price-label";
import type { AppLocale } from "@/lib/language-settings";
import {
  formatDateLong,
  formatDuration,
  formatTimeOfDay,
} from "@/lib/i18n/format";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

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

// A calendar date, read at local midnight so no zone can move it. The
// 12-hour clock that sat beside this is formatTimeOfDay now (§5q).
const fmtDate = (dateStr: string, locale: AppLocale) => {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return formatDateLong(new Date(y, mo - 1, d), locale);
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
  isSubStepComplete?: (stepIndex: number) => boolean;
  startDate: string;
  setStartDate: (date: string) => void;
  checkInTime: string;
  setCheckInTime: (time: string) => void;
  checkOutTime: string;
  setCheckOutTime: (time: string) => void;
  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  setExtraServices: (
    services: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) => void;
  selectedPets: Pet[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EvaluationDetails({
  currentSubStep,
  isSubStepComplete,
  startDate,
  setStartDate,
  setCheckInTime,
  setCheckOutTime,
  extraServices,
  setExtraServices,
  selectedPets,
}: EvaluationDetailsProps) {
  const t = useShellText("booking");
  const locale = useShellLocale();
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
  const [showCalendar, setShowCalendar] = React.useState(!startDate);

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

  // Compute dates that fall on days of the week that aren't allowed for evaluations.
  const disabledDayOfWeekDates = React.useMemo(() => {
    const allowedDays = evaluation.schedule.allowedDays;
    if (!allowedDays || allowedDays.length === 0) return [];
    const allowedIndices = new Set(
      allowedDays.map((d) => DAY_NAME_TO_INDEX[d] ?? -1),
    );
    const maxDays = (evaluation.maxAdvanceDays ?? 90) + 1;
    const today = new Date();
    const dates: Date[] = [];
    for (let i = 0; i <= maxDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (!allowedIndices.has(d.getDay())) {
        dates.push(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      }
    }
    return dates;
  }, [evaluation.schedule.allowedDays, evaluation.maxAdvanceDays]);

  const allBlockedDates = React.useMemo(
    () => [...blockedDatesForEvaluation, ...disabledDayOfWeekDates],
    [blockedDatesForEvaluation, disabledDayOfWeekDates],
  );

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
              label: t("allDay"),
              startTime: "00:00",
              endTime: "23:59",
            },
          ],
    [evaluation.schedule.timeWindows, t],
  );

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

  const isToday = startDate === todayString();
  const currentMinutes = isToday ? nowInMinutes() : -1;
  const slotsWithPast = slots.map((slot) => ({
    ...slot,
    isPast: isToday && timeToMinutes(slot.startTime) <= currentMinutes,
  }));
  const availableSlots = slotsWithPast.filter((s) => !s.isPast);

  const handleSelectionChange = (dates: Date[]) => {
    if (dates.length > 0) {
      setStartDate(formatDateString(dates[0]));
      setSelectedSlot(null);
      setCheckInTime("");
      setCheckOutTime("");
      setShowCalendar(false);
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

  const selectedSlotData = slots.find((s) => s.startTime === selectedSlot);

  return (
    <div className="space-y-5">
      {/* ── Step 0: Schedule ──────────────────────────────────────────── */}
      {currentSubStep === 0 && (
        <>
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <ClipboardCheck className="size-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-semibold">{t("scheduleYourEvaluation")}</h3>
              <p className="text-muted-foreground text-sm">
                {evaluation.description || t("chooseEvaluationDateTime")}
              </p>
            </div>
          </div>

          {/* Compact date/time flow */}
          <div className="space-y-3">
            {/* Date selection */}
            {showCalendar || !startDate ? (
              <div className="mx-auto max-w-md overflow-hidden rounded-xl border shadow-sm">
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
                  disabledDates={allBlockedDates}
                  disabledDateMessages={blockedDateMessagesForEvaluation}
                  holidays={holidays}
                />
              </div>
            ) : (
              /* Selected date chip — click to change */
              <button
                type="button"
                onClick={() => setShowCalendar(true)}
                className="group flex w-full items-center justify-between rounded-xl border bg-violet-50 px-4 py-3 transition-colors hover:bg-violet-100"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100">
                    <CalendarDays className="size-4 text-violet-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-violet-800">
                      {fmtDate(startDate, locale)}
                    </p>
                    <p className="text-[11px] text-violet-500">
                      {t(
                        availableSlots.length === 1
                          ? "timeSlotsAvailableOne"
                          : "timeSlotsAvailableOther",
                      ).replace("{n}", String(availableSlots.length))}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-violet-400 group-hover:text-violet-600">
                  {t("change")}
                </span>
              </button>
            )}

            {/* Duration selector */}
            {startDate && !showCalendar && durationOptions.length > 1 && (
              <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
                <Clock className="text-muted-foreground size-4" />
                <span className="text-muted-foreground text-sm">
                  {t("duration")}
                </span>
                <Select
                  value={String(selectedDuration)}
                  onValueChange={(v) => {
                    setSelectedDuration(Number(v));
                    setSelectedSlot(null);
                    setCheckInTime("");
                    setCheckOutTime("");
                  }}
                >
                  <SelectTrigger className="ml-auto h-8 w-36 text-xs">
                    <SelectValue placeholder={t("sessionLength")} />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>
                        {t("sessionOfDuration").replace(
                          "{duration}",
                          formatDuration(opt, locale),
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time slots — compact grid */}
            {startDate && !showCalendar && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between px-1">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {t("availableTimes")}
                  </p>
                  {availableSlots.length > 0 && (
                    <span className="text-muted-foreground text-[10px]">
                      {t(
                        availableSlots.length === 1
                          ? "slotCountOne"
                          : "slotCountOther",
                      ).replace("{n}", String(availableSlots.length))}
                    </span>
                  )}
                </div>

                {availableSlots.length === 0 ? (
                  <div className="space-y-3 rounded-xl border border-dashed px-4 py-8 text-center">
                    <p className="text-sm font-medium">{t("noAvailability")}</p>
                    <p className="text-muted-foreground text-xs">
                      {isToday
                        ? t("allTimesHavePassedFor")
                        : t("noOpenSlotsOnDate")}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => setShowCalendar(true)}
                    >
                      <ArrowLeft className="size-3" />
                      {t("chooseAnotherDate")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slotsWithPast
                      .filter((s) => !s.isPast)
                      .map((slot) => {
                        const isSelected = selectedSlot === slot.startTime;
                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            onClick={() => handleSlotSelect(slot.startTime)}
                            className={cn(
                              "flex flex-col items-center rounded-xl border-2 px-3 py-2.5 transition-all",
                              isSelected
                                ? "border-violet-500 bg-violet-50 shadow-sm"
                                : "border-transparent bg-slate-50 hover:border-violet-200 hover:bg-violet-50/50",
                            )}
                          >
                            <span
                              className={cn(
                                "text-sm font-semibold tabular-nums",
                                isSelected
                                  ? "text-violet-700"
                                  : "text-slate-700",
                              )}
                            >
                              {formatTimeOfDay(slot.startTime, locale)}
                            </span>
                            <span
                              className={cn(
                                "text-[10px]",
                                isSelected
                                  ? "text-violet-500"
                                  : "text-slate-400",
                              )}
                            >
                              {formatTimeOfDay(slot.endTime, locale)}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Summary strip */}
            {startDate && selectedSlot && selectedSlotData && (
              <div className="flex items-center gap-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
                <CheckCircle2 className="size-5 shrink-0 text-violet-600" />
                <div className="flex min-w-0 flex-1 flex-wrap gap-x-6 gap-y-0.5">
                  <div>
                    <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      {t("date")}
                    </p>
                    <p className="text-sm font-semibold text-violet-800">
                      {fmtDate(startDate, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      {t("timeLabel")}
                    </p>
                    <p className="text-sm font-semibold text-violet-800">
                      {formatTimeOfDay(selectedSlotData.startTime, locale)} –{" "}
                      {formatTimeOfDay(selectedSlotData.endTime, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      {t("duration")}
                    </p>
                    <p className="text-sm font-semibold text-violet-800">
                      {formatDuration(selectedSlotData.duration, locale)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Step 1: Add-ons ──────────────────────────────────────────── */}
      {currentSubStep === 1 && (
        <EvaluationAddOnsSubStep
          isStepAccessible={isSubStepComplete}
          extraServices={extraServices}
          setExtraServices={setExtraServices}
          selectedPets={selectedPets}
        />
      )}
    </div>
  );
}

// ── Add-ons sub-step ────────────────────────────────────────────────────────

function EvaluationAddOnsSubStep({
  isStepAccessible,
  extraServices,
  setExtraServices,
  selectedPets,
}: {
  isStepAccessible?: (step: number) => boolean;
  extraServices: Array<{ serviceId: string; quantity: number; petId: number }>;
  setExtraServices: (
    services: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) => void;
  selectedPets: Pet[];
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  // Show add-ons applicable to evaluation OR daycare (since eval is a daycare trial)
  // The facility's own extras, from `facility_settings`. One of thirteen
  // copies of a localStorage loader, so what a booking could be upsold
  // depended on the browser it was taken in.
  const { addOns: facilityAddOns } = useServiceAddOns();

  const addOns = facilityAddOns.filter((a) => {
    if (!a.isActive) return false;
    if (
      !a.applicableServices.includes("evaluation") &&
      !a.applicableServices.includes("daycare")
    )
      return false;
    if (a.petTypeFilter && selectedPets.length > 0) {
      const pf = a.petTypeFilter;
      const allMatch = selectedPets.every((pet) => {
        if (pf.types?.length && !pf.types.includes(pet.type)) return false;
        if (pf.weightMin != null && pet.weight < pf.weightMin) return false;
        if (pf.weightMax != null && pet.weight > pf.weightMax) return false;
        return true;
      });
      if (!allMatch) return false;
    }
    return true;
  });

  const accessible = isStepAccessible ? isStepAccessible(0) : true;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <Sparkles className="size-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-semibold">{t("addOnsHeading")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("evaluationAddOnsHint")}
          </p>
        </div>
      </div>

      {!accessible && (
        <div className="bg-muted/50 rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            {t("pleaseCompleteTheScheduleStep2")}
          </p>
        </div>
      )}

      {accessible && addOns.length === 0 && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            {t("noAddOnsAvailableFor")}
          </p>
        </div>
      )}

      {accessible && addOns.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {addOns.map((service) => {
            const totalQty = extraServices
              .filter((es) => es.serviceId === service.id)
              .reduce((sum, es) => sum + es.quantity, 0);
            const isAdded = totalQty > 0;
            const priceLabel = addOnPriceLabel(service, t, locale);
            const hasUnits = service.pricingType !== "flat";
            const petId = selectedPets[0]?.id ?? 0;

            const toggle = () => {
              if (isAdded) {
                setExtraServices(
                  extraServices.filter((es) => es.serviceId !== service.id),
                );
              } else {
                setExtraServices([
                  ...extraServices,
                  { serviceId: service.id, quantity: 1, petId },
                ]);
              }
            };

            const setQty = (q: number) => {
              if (q <= 0) {
                setExtraServices(
                  extraServices.filter((es) => es.serviceId !== service.id),
                );
              } else {
                const max = service.maxQuantity ?? 10;
                const clamped = Math.min(q, max);
                const without = extraServices.filter(
                  (es) => es.serviceId !== service.id,
                );
                setExtraServices([
                  ...without,
                  { serviceId: service.id, quantity: clamped, petId },
                ]);
              }
            };

            return (
              <div
                key={service.id}
                className={cn(
                  "group flex flex-col overflow-hidden rounded-2xl border-2 transition-all duration-200",
                  isAdded
                    ? "bg-primary/5 border-transparent shadow-md"
                    : "border-border hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg",
                )}
              >
                {/* Image */}
                <div className="relative h-28 w-full overflow-hidden">
                  {service.image ? (
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="bg-muted flex size-full items-center justify-center">
                      <PawPrint className="text-muted-foreground/30 size-10" />
                    </div>
                  )}
                  {isAdded && (
                    <div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
                      <Check className="size-3.5 text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-3">
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm/tight font-semibold">
                      {service.name}
                    </p>
                    <span className="text-primary shrink-0 text-xs font-bold">
                      {priceLabel}
                    </span>
                  </div>
                  {service.description && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px]">
                      {service.description}
                    </p>
                  )}

                  <div className="mt-auto pt-2">
                    {hasUnits ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="size-7 p-0"
                          disabled={!isAdded}
                          onClick={() => setQty(totalQty - 1)}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">
                          {totalQty}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="size-7 p-0"
                          onClick={() => setQty(totalQty + 1)}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant={isAdded ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-full gap-1.5 text-xs"
                        onClick={toggle}
                      >
                        {isAdded ? (
                          <>
                            <Check className="size-3" />
                            {t("added")}
                          </>
                        ) : (
                          <>
                            <Plus className="size-3" />
                            {t("add")}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

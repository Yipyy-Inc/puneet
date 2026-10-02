"use client";

import { useMemo, useState, type ReactNode } from "react";

import { useSettings } from "@/hooks/use-settings";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import {
  advanceBounds,
  dayStatus,
  isoDay,
  pickRange,
  stayNights,
} from "@/lib/bookings/wizard/calendar-month";
import {
  chipStep,
  chipTimes,
  dayWindows,
  defaultDropOff,
  defaultPickUp,
  hhmmOf,
  minutesOf,
} from "@/lib/bookings/wizard/time-windows";
import {
  formatTimeOfDay,
  formatWeekdayDate,
  isPluralOne,
} from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

import { MonthCalendar } from "./MonthCalendar";
import { TimePicker } from "./TimePicker";
import { TimesCard } from "./TimesCard";

// ============================================================================
// Boarding's Schedule screen (the client's mock, 2026-10-01): "Select the
// stay" — check-in, then check-out, on one month — and beside it the stay,
// its nights, and the drop-off and pick-up times for those two days.
// ============================================================================

export function BoardingSchedule({
  isCustomer,
  start,
  end,
  checkIn,
  checkOut,
  onRange,
  onTimes,
  full,
  top,
}: {
  isCustomer: boolean;
  start: Date | null;
  end: Date | null;
  checkIn: string;
  checkOut: string;
  /** A new range; `times` are the defaults when the stay is complete. */
  onRange: (
    start: Date | null,
    end: Date | null,
    times: { checkIn: string; checkOut: string } | null,
  ) => void;
  onTimes: (checkIn: string, checkOut: string) => void;
  /** Nights with no room left. */
  full?: ReadonlySet<string>;
  /** Above the two cards: the customer's choice of service, for now. */
  top?: ReactNode;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const {
    hours,
    rules,
    serviceDateBlocks,
    scheduleTimeOverrides,
    dropOffPickUpOverrides,
    holidays,
  } = useSettings();
  const { settings } = useFacilitySettings();
  const cutOff = settings.lodging_config?.value?.checkoutCutOff;
  // The facility's own drop-off and pick-up hours, per weekday.
  const standing = settings.service_time_windows?.value;

  const [month, setMonth] = useState(() => {
    const from = start ?? new Date();
    return new Date(from.getFullYear(), from.getMonth(), 1);
  });
  const thisMonth = new Date();
  const canGoBack =
    month.getFullYear() * 12 + month.getMonth() >
    thisMonth.getFullYear() * 12 + thisMonth.getMonth();

  const overrides = useMemo(
    () =>
      scheduleTimeOverrides.filter(
        (o) => !o.services?.length || o.services.includes("boarding"),
      ),
    [scheduleTimeOverrides],
  );
  const { blockedStart, blockedEnd } = useMemo(() => {
    const blocks = serviceDateBlocks.filter((b) =>
      b.services.includes("boarding"),
    );
    return {
      blockedStart: new Set(
        blocks.filter((b) => b.closed || b.blockCheckIn).map((b) => b.date),
      ),
      blockedEnd: new Set(
        blocks.filter((b) => b.closed || b.blockCheckOut).map((b) => b.date),
      ),
    };
  }, [serviceDateBlocks]);
  const bounds = advanceBounds(
    new Date(),
    rules.minimumAdvanceBooking,
    rules.maximumAdvanceBooking,
  );
  const pickingEnd = !!start && !end;
  const statusOf = (day: Date) =>
    dayStatus(day, {
      today: new Date(),
      hours,
      overrides,
      ...bounds,
      blocked: pickingEnd ? blockedEnd : blockedStart,
      holidays,
      // A full day can still be the day a stay ends: no night is spent there.
      full: pickingEnd ? undefined : full,
    });

  const windowsOf = (day: Date) =>
    dayWindows({
      date: day,
      service: "boarding",
      hours,
      overrides,
      dropOffPickUp: dropOffPickUpOverrides,
      standing,
    });

  const pick = (day: Date) => {
    const next = pickRange({ start, end }, day, (night) =>
      full ? full.has(isoDay(night)) : false,
    );
    if (!next.end) {
      onRange(next.start, null, null);
      return;
    }
    const inWin = windowsOf(next.start);
    const outWin = windowsOf(next.end);
    onRange(next.start, next.end, {
      checkIn: hhmmOf(
        inWin ? defaultDropOff(inWin.dropOff, chipStep(inWin.dropOff)) : 8 * 60,
      ),
      checkOut: hhmmOf(
        outWin
          ? defaultPickUp(outWin.pickUp, chipStep(outWin.pickUp))
          : 17 * 60,
      ),
    });
  };

  const nights = start && end ? stayNights(start, end).length : 0;
  const inWin = start && end ? windowsOf(start) : null;
  const outWin = start && end ? windowsOf(end) : null;
  // Staff are told where the windows come from: the facility's own
  // drop-off and pick-up hours where it set them, else its business hours.
  const note = [
    isCustomer
      ? t("wizHoursNoteCustomer")
      : standing?.boarding?.length
        ? t("wizWindowsNoteBoarding")
        : t("wizHoursNoteStaff"),
    !isCustomer && cutOff?.enabled && cutOff.time
      ? fill(t("wizCutOffNote"), { time: formatTimeOfDay(cutOff.time, locale) })
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-[18px]">
      {top}
      <div className="flex flex-col gap-0.5">
        <h3 className="text-section text-body-ink">{t("wizSelectStay")}</h3>
        <p className="text-meta text-ink-tertiary">{t("wizSelectStayHint")}</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-4">
        <MonthCalendar
          month={month}
          onMonth={setMonth}
          canGoBack={canGoBack}
          selection={{ start, end }}
          statusOf={statusOf}
          onPick={pick}
          onClear={() => onRange(null, null, null)}
          showNights
          blockedLabel={t("wizFullyBooked")}
        />
        <TimesCard
          empty={
            start && end
              ? null
              : {
                  title: start ? t("wizPickCheckOut") : t("wizPickCheckIn"),
                  text: t("wizTimesAppearHere"),
                }
          }
          kicker={t("wizYourStay")}
          range={
            start && end
              ? `${formatWeekdayDate(start, locale)} → ${formatWeekdayDate(end, locale)}`
              : ""
          }
          count={fill(
            t(isPluralOne(nights, locale) ? "wizNightsOne" : "wizNightsOther"),
            { count: nights },
          )}
          note={note}
        >
          {start && end && inWin && outWin ? (
            <>
              <TimePicker
                name="wizard-drop-off"
                label={fill(t("wizDropOffOn"), {
                  day: formatWeekdayDate(start, locale),
                })}
                chips={chipTimes(inWin.dropOff, chipStep(inWin.dropOff))}
                value={minutesOf(checkIn)}
                onChange={(minutes) => onTimes(hhmmOf(minutes), checkOut)}
                window={inWin.dropOff}
                open={inWin.open}
                asCustomer={isCustomer}
              />
              <TimePicker
                name="wizard-pick-up"
                label={fill(t("wizPickUpOn"), {
                  day: formatWeekdayDate(end, locale),
                })}
                chips={chipTimes(outWin.pickUp, chipStep(outWin.pickUp))}
                value={minutesOf(checkOut)}
                onChange={(minutes) => onTimes(checkIn, hhmmOf(minutes))}
                window={outWin.pickUp}
                open={outWin.open}
                asCustomer={isCustomer}
              />
            </>
          ) : null}
        </TimesCard>
      </div>
    </div>
  );
}

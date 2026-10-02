"use client";

import { useMemo, useState } from "react";

import { ChoicePill } from "@/components/ui/choice-pill";
import { useLocationContext } from "@/hooks/use-location-context";
import { useSettings } from "@/hooks/use-settings";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import { useDaycareMenu } from "@/lib/api/daycare-catalogue";
import {
  advanceBounds,
  dayStatus,
  isoDay,
  toggleDay,
} from "@/lib/bookings/wizard/calendar-month";
import {
  chipStep,
  chipTimes,
  dayWindows,
  hhmmOf,
  intersect,
  minutesOf,
  type DayPart,
  type DayWindows,
} from "@/lib/bookings/wizard/time-windows";
import { formatDateShort, formatMoney, isPluralOne } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { eligibleDaycareServices } from "@/lib/pricing/daycare-service-choice";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { DaycareDateTime } from "@/types/booking";
import type { Pet } from "@/types/pet";

import { HALF_DAY_HOURS } from "@/lib/bookings/wizard/service-prices";

import { MonthCalendar } from "./MonthCalendar";
import { TimePicker } from "./TimePicker";
import { TimesCard } from "./TimesCard";

// ============================================================================
// Daycare's Schedule screen (the client's mock, 2026-10-01): "Select daycare
// days" — every day wanted, clicked again to remove; closed days struck
// through — and beside it the day type (the facility's daycare services; a
// half day asks Morning or Afternoon), the days picked, and one drop-off and
// one pick-up time that apply to every one of them.
// ============================================================================

export interface DaycareChoice {
  rowId: string;
  name: string;
  price: number;
}

export function DaycareSchedule({
  isCustomer,
  pets,
  days,
  onDays,
  dateTimes,
  onDateTimes,
  service,
  onService,
  part,
  onPart,
}: {
  isCustomer: boolean;
  pets: readonly Pet[];
  days: readonly Date[];
  onDays: (days: Date[]) => void;
  dateTimes: readonly DaycareDateTime[];
  onDateTimes: (times: DaycareDateTime[]) => void;
  service: DaycareChoice | null;
  onService: (service: DaycareChoice | null) => void;
  part: Exclude<DayPart, "full">;
  onPart: (part: Exclude<DayPart, "full">) => void;
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
  // The facility's own drop-off and pick-up hours: full day, morning, afternoon.
  const standing = useFacilitySettings().settings.service_time_windows?.value;
  const { currentLocation } = useLocationContext();
  const locationId = currentLocation?.id ?? null;
  const petRefs = pets.map((p) => p.id).filter((id) => Number.isInteger(id));
  const { data: menu } = useDaycareMenu({
    asCustomer: isCustomer,
    locationId,
    petRefs,
  });
  const species = new Set(
    pets.map((p) => p.type?.trim().toLowerCase()).filter(Boolean),
  );
  const first = pets[0];
  const offered = eligibleDaycareServices(
    menu ?? [],
    {
      species: species.size === 1 ? (first?.type ?? null) : null,
      breed: pets.length === 1 ? (first?.breed ?? null) : null,
      weightLb: pets.length === 1 ? (first?.weight ?? null) : null,
      petTags: [],
    },
    locationId,
  );
  const chosen = offered.find((s) => s.rowId === service?.rowId);
  const halfHours =
    chosen?.maxDurationHours != null &&
    chosen.maxDurationHours <= HALF_DAY_HOURS
      ? chosen.maxDurationHours
      : null;
  const dayPart: DayPart = halfHours ? part : "full";

  const [month, setMonth] = useState(() => {
    const from = days[0] ?? new Date();
    return new Date(from.getFullYear(), from.getMonth(), 1);
  });
  const now = new Date();
  const canGoBack =
    month.getFullYear() * 12 + month.getMonth() >
    now.getFullYear() * 12 + now.getMonth();

  const overrides = useMemo(
    () =>
      scheduleTimeOverrides.filter(
        (o) => !o.services?.length || o.services.includes("daycare"),
      ),
    [scheduleTimeOverrides],
  );
  const blocked = useMemo(
    () =>
      new Set(
        serviceDateBlocks
          .filter((b) => b.closed && b.services.includes("daycare"))
          .map((b) => b.date),
      ),
    [serviceDateBlocks],
  );
  const bounds = advanceBounds(
    now,
    rules.minimumAdvanceBooking,
    rules.maximumAdvanceBooking,
  );

  const windowsOf = (day: Date, partNow: DayPart = dayPart) =>
    dayWindows({
      date: day,
      service: "daycare",
      part: partNow,
      halfHours,
      hours,
      overrides,
      dropOffPickUp: dropOffPickUpOverrides,
      standing,
    });
  // The same times every day: the part of each window all the days share.
  const common = (list: readonly Date[], partNow: DayPart = dayPart) => {
    const windows = list
      .map((day) => windowsOf(day, partNow))
      .filter((w): w is DayWindows => w !== null);
    const dropOff = intersect(windows.map((w) => w.dropOff));
    const pickUp = intersect(windows.map((w) => w.pickUp));
    const open = intersect(windows.map((w) => w.open));
    return dropOff && pickUp && open ? { dropOff, pickUp, open } : null;
  };

  const timesFor = (
    list: readonly Date[],
    checkIn: string,
    checkOut: string,
  ): DaycareDateTime[] =>
    list.map((day) => ({
      date: isoDay(day),
      checkInTime: checkIn,
      checkOutTime: checkOut,
    }));

  /** The mock's defaults: the first drop-off and the last pick-up. */
  const defaults = (list: readonly Date[], partNow: DayPart = dayPart) => {
    const w = common(list, partNow);
    if (!w) return null;
    const drops = chipTimes(w.dropOff, chipStep(w.dropOff));
    const picks = chipTimes(w.pickUp, chipStep(w.pickUp));
    return {
      checkIn: hhmmOf(drops[0] ?? w.dropOff.start),
      checkOut: hhmmOf(picks.at(-1) ?? w.pickUp.end),
    };
  };

  const pick = (day: Date) => {
    const next = toggleDay(days, day);
    onDays(next);
    const current = dateTimes[0];
    const times = current
      ? { checkIn: current.checkInTime, checkOut: current.checkOutTime }
      : defaults(next);
    onDateTimes(times ? timesFor(next, times.checkIn, times.checkOut) : []);
  };

  const reset = (partNow: DayPart) => {
    const times = defaults(days, partNow);
    if (times) onDateTimes(timesFor(days, times.checkIn, times.checkOut));
  };

  const shared = days.length > 0 ? common(days) : null;
  const checkIn = dateTimes[0]?.checkInTime ?? "";
  const checkOut = dateTimes[0]?.checkOutTime ?? "";

  const dayTypes = (
    <div className="flex flex-col gap-2.5">
      <p className="text-micro text-ink-tertiary uppercase">
        {t("wizDayType")}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {offered.map((option) => {
          const on = option.rowId === service?.rowId;
          return (
            <button
              key={option.rowId}
              type="button"
              aria-pressed={on}
              data-on={on}
              onClick={() => {
                onService({
                  rowId: option.rowId,
                  name: option.name,
                  price: option.price,
                });
                const half =
                  option.maxDurationHours != null &&
                  option.maxDurationHours <= HALF_DAY_HOURS;
                if (days.length > 0) {
                  const partNow: DayPart = half ? part : "full";
                  const w = days
                    .map((d) =>
                      dayWindows({
                        date: d,
                        service: "daycare",
                        part: partNow,
                        halfHours: half ? option.maxDurationHours : null,
                        hours,
                        overrides,
                        dropOffPickUp: dropOffPickUpOverrides,
                        standing,
                      }),
                    )
                    .filter((x): x is DayWindows => x !== null);
                  const dropOff = intersect(w.map((x) => x.dropOff));
                  const pickUp = intersect(w.map((x) => x.pickUp));
                  if (dropOff && pickUp) {
                    onDateTimes(
                      timesFor(
                        days,
                        hhmmOf(
                          chipTimes(dropOff, chipStep(dropOff))[0] ??
                            dropOff.start,
                        ),
                        hhmmOf(
                          chipTimes(pickUp, chipStep(pickUp)).at(-1) ??
                            pickUp.end,
                        ),
                      ),
                    );
                  }
                }
              }}
              className="border-line-strong bg-card hover:border-ink-disabled focus-visible:outline-primary flex min-h-12 flex-col gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-[box-shadow,border-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] motion-reduce:transition-none"
            >
              <span className="text-body-strong text-body-ink">
                {option.name}
              </span>
              <span className="text-meta text-ink-tertiary tabular-nums">
                {option.maxDurationHours != null
                  ? fill(t("wizDayTypeSub"), {
                      price: formatMoney(option.price, locale, {
                        whole: Number.isInteger(option.price),
                      }),
                      hours: option.maxDurationHours,
                    })
                  : formatMoney(option.price, locale, {
                      whole: Number.isInteger(option.price),
                    })}
              </span>
            </button>
          );
        })}
      </div>
      {offered.length === 0 && menu ? (
        <p className="text-meta text-ink-secondary">{t("wizNoDayType")}</p>
      ) : null}
      {halfHours ? (
        <div
          role="radiogroup"
          aria-label={t("wizHalfDayPart")}
          className="flex flex-wrap gap-2"
        >
          {(["am", "pm"] as const).map((value) => (
            <ChoicePill
              key={value}
              type="radio"
              name="wizard-half-day"
              value={value}
              checked={part === value}
              onChange={() => {
                onPart(value);
                reset(value);
              }}
            >
              {value === "am" ? t("wizMorningAm") : t("wizAfternoonPm")}
            </ChoicePill>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-section text-body-ink">{t("wizSelectDays")}</h3>
        <p className="text-meta text-ink-tertiary">{t("wizSelectDaysHint")}</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-4">
        <MonthCalendar
          month={month}
          onMonth={setMonth}
          canGoBack={canGoBack}
          selection={{ days }}
          statusOf={(day) =>
            dayStatus(day, {
              today: now,
              hours,
              overrides,
              ...bounds,
              blocked,
              holidays,
            })
          }
          onPick={pick}
          onClear={() => {
            onDays([]);
            onDateTimes([]);
          }}
          showNights={false}
          blockedLabel={t("wizClosed")}
        />
        <TimesCard
          top={dayTypes}
          empty={
            days.length > 0
              ? null
              : { title: t("wizPickDays"), text: t("wizTimesAppearHere") }
          }
          kicker={t("wizDaysSelected")}
          range={days.map((d) => formatDateShort(d, locale)).join(", ")}
          count={fill(
            t(isPluralOne(days.length, locale) ? "wizDaysOne" : "wizDaysOther"),
            { count: days.length },
          )}
          note={
            isCustomer
              ? t("wizSameTimesCustomer")
              : standing?.daycare &&
                  (standing.daycare.full ||
                    standing.daycare.am ||
                    standing.daycare.pm)
                ? t("wizSameTimesStaffWindows")
                : t("wizSameTimesStaff")
          }
        >
          {shared ? (
            <>
              <TimePicker
                name="wizard-drop-off"
                label={t("wizDropOff")}
                chips={chipTimes(shared.dropOff, chipStep(shared.dropOff))}
                value={minutesOf(checkIn)}
                onChange={(minutes) =>
                  onDateTimes(timesFor(days, hhmmOf(minutes), checkOut))
                }
                window={shared.dropOff}
                open={shared.open}
                asCustomer={isCustomer}
              />
              <TimePicker
                name="wizard-pick-up"
                label={t("wizPickUp")}
                chips={chipTimes(shared.pickUp, chipStep(shared.pickUp))}
                value={minutesOf(checkOut)}
                onChange={(minutes) =>
                  onDateTimes(timesFor(days, checkIn, hhmmOf(minutes)))
                }
                window={shared.pickUp}
                open={shared.open}
                asCustomer={isCustomer}
              />
            </>
          ) : days.length > 0 ? (
            <p className="text-meta text-ink-secondary">
              {t("wizNoSharedTimes")}
            </p>
          ) : null}
        </TimesCard>
      </div>
    </div>
  );
}

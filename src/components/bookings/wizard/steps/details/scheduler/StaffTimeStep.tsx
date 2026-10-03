"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { Segmented } from "@/components/ui/segmented";
import { useSettings } from "@/hooks/use-settings";
import { useStaffAvailability } from "@/lib/api/staff-availability";
import {
  advanceBounds,
  dayStatus,
  isoDay,
} from "@/lib/bookings/wizard/calendar-month";
import {
  backToBack,
  nextDays,
  shortPersonName,
  type SlotOffer,
} from "@/lib/bookings/wizard/staff-slots";
import { hhmmOf } from "@/lib/bookings/wizard/time-windows";
import {
  formatDuration,
  formatList,
  formatTimeOfDay,
  formatWeekday,
  formatWeekdayDate,
} from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { Pet } from "@/types/pet";

// ============================================================================
// Grooming's "Groomer & time" (the client's mock, 2026-10-01):
//
//   Pick a groomer & time            [Earliest available | Choose a groomer]
//   Bubu and Mango are groomed back-to-back · 3h 45m total
//   EARLIEST OPENING  Thu, Oct 1 · 11:00 AM with Maya R.     [Take this slot]
//   THU 1  FRI 2  SAT 3 … (14 days: "N open" / Full / Closed)
//   Fri, Oct 2 · all groomers                    Each slot fits 3h 45m
//   9:00 AM · Maya R.   9:30 AM · Jordan L. …
//
// The times are the server's (`/api/…/grooming/availability`): each
// groomer's open starts for the WHOLE appointment — every pet back to back,
// add-ons and matting included. Which days the facility is closed is the
// facility's hours, date blocks and holidays, read the way every schedule
// screen reads them. Only groomers who do every chosen package (and handle
// matting, when a coat is matted) are offered; the rest are named below.
// ============================================================================

const STRIP_DAYS = 14;

export interface StaffTime {
  date: string | null;
  /** Minutes from midnight. */
  start: number | null;
  groomerId: string | null;
  /** The groomer as the client is shown them, for Confirm. */
  groomerName?: string | null;
}

export function StaffTimeStep({
  role,
  isCustomer,
  pets,
  petMinutes,
  packageIds,
  matted,
  noticeHours,
  value,
  onChange,
  excludeBookingIds,
}: {
  /** Whose time: a groomer's (grooming) or a trainer's (a lesson). */
  role: "groomer" | "trainer";
  isCustomer: boolean;
  pets: readonly Pet[];
  /** Each pet's appointment, in order: groom, matting and its add-ons. */
  petMinutes: readonly number[];
  /** The pets' packages: a groomer must do every one. */
  packageIds: readonly string[];
  /** A coat is marked matted: the groomer must handle matting. */
  matted: boolean;
  /** A customer's minimum notice, in hours. */
  noticeHours?: number;
  value: StaffTime;
  onChange: (next: StaffTime) => void;
  excludeBookingIds?: readonly string[];
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const { hours, rules, serviceDateBlocks, scheduleTimeOverrides, holidays } =
    useSettings();

  const [mode, setMode] = useState<"earliest" | "choose">(
    value.groomerId && !isCustomer ? "choose" : "earliest",
  );
  const [chosenId, setChosenId] = useState<string | null>(
    mode === "choose" ? value.groomerId : null,
  );

  const total = backToBack(petMinutes);
  const today = isoDay(new Date());
  const dates = nextDays(today, STRIP_DAYS);
  const { data, isPending, isError } = useStaffAvailability({
    kind: role === "groomer" ? "grooming" : "training",
    asCustomer: isCustomer,
    from: today,
    days: STRIP_DAYS,
    minutes: total,
    noticeHours,
    excludeBookingIds,
    enabled: total > 0,
  });
  const groomers = data?.staff ?? [];
  const days = data?.days ?? [];

  const qualifies = (g: (typeof groomers)[number]) =>
    (g.packageIds.length === 0 ||
      packageIds.every((id) => g.packageIds.includes(id))) &&
    (!matted || g.canHandleMatted);
  const able = groomers.filter(qualifies);
  const unable = groomers.filter((g) => !qualifies(g) && g.name);
  const chosen =
    mode === "choose" ? (able.find((g) => g.id === chosenId) ?? null) : null;
  // A groomer the facility keeps off the online booking has no name here.
  const nameOf = (id: string) =>
    groomers.find((g) => g.id === id)?.name ?? null;

  // Days the facility does not groom, by its own hours, blocks and holidays.
  const overrides = scheduleTimeOverrides.filter(
    (o) => !o.services?.length || o.services.includes("grooming"),
  );
  const blocked = new Set(
    serviceDateBlocks
      .filter((b) => b.services.includes("grooming") && b.closed)
      .map((b) => b.date),
  );
  const bounds = advanceBounds(
    new Date(),
    rules.minimumAdvanceBooking,
    rules.maximumAdvanceBooking,
  );
  const shut = (date: string) => {
    const status = dayStatus(new Date(`${date}T12:00:00`), {
      today: new Date(),
      hours,
      overrides,
      ...bounds,
      blocked,
      holidays,
    });
    return status !== "open";
  };

  // One day's starts for the pool: the chosen groomer, else everyone able —
  // each start once, the first groomer (the facility's order) who is free.
  const offersOn = (date: string): SlotOffer[] => {
    if (shut(date)) return [];
    const day = days.find((d) => d.date === date);
    if (!day) return [];
    const pool = chosen ? [chosen] : able;
    const byStart = new Map<number, string>();
    for (const g of pool) {
      for (const start of day.starts[g.id] ?? []) {
        if (!byStart.has(start)) byStart.set(start, g.id);
      }
    }
    return [...byStart.entries()]
      .sort(([a], [b]) => a - b)
      .map(([start, staffId]) => ({ start, staffId }));
  };
  const working = (date: string) => {
    const day = days.find((d) => d.date === date);
    const pool = chosen ? [chosen] : able;
    return !!day && pool.some((g) => g.id in day.starts);
  };

  const firstOpen = dates.find((date) => offersOn(date).length > 0) ?? null;
  const earliest = firstOpen
    ? { date: firstOpen, offer: offersOn(firstOpen)[0]! }
    : null;
  const shownDate =
    value.date && dates.includes(value.date) && !shut(value.date)
      ? value.date
      : (firstOpen ?? dates[0]!);
  const slots = offersOn(shownDate);

  const pick = (date: string, offer: SlotOffer) =>
    onChange({
      date,
      start: offer.start,
      groomerId: offer.staffId,
      groomerName: (() => {
        const name = groomers.find((g) => g.id === offer.staffId)?.name;
        return name ? shortPersonName(name) : null;
      })(),
    });

  const nextFor = (groomerId: string) => {
    for (const date of dates) {
      if (shut(date)) continue;
      const first = days.find((d) => d.date === date)?.starts[groomerId]?.[0];
      if (first !== undefined) return { date, start: first };
    }
    return null;
  };

  const time = (minutes: number) => formatTimeOfDay(hhmmOf(minutes), locale);
  // The words that differ by whose time it is — literal keys, so every one
  // is a string the catalogue holds.
  const words =
    role === "groomer"
      ? {
          title: t("wizPickGroomerTime"),
          earliest: t("wizEarliestAvailable"),
          choose: t("wizChooseAGroomer"),
          noneOnline: t("wizNoGroomersOnline"),
          chooseFirst: t("wizChooseGroomerFirst"),
          slotsAll: t("wizSlotsAll"),
        }
      : {
          title: t("wizPickTrainerTime"),
          earliest: t("wizAnyTrainer"),
          choose: t("wizChooseATrainer"),
          noneOnline: t("wizNoTrainersOnline"),
          chooseFirst: t("wizChooseTrainerFirst"),
          slotsAll: t("wizSlotsAllTrainers"),
        };
  const subtitle =
    role === "trainer"
      ? fill(t("wizSessionLength"), {
          total: formatDuration(total, locale),
        })
      : pets.length > 1
        ? fill(t("wizBackToBack"), {
            pets: formatList(
              pets.map((p) => p.name),
              locale,
            ),
            total: formatDuration(total, locale),
          })
        : fill(t("wizAppointmentLength"), {
            total: formatDuration(total, locale),
          });

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <h3 className="text-body-ink text-[17px] font-semibold">
            {words.title}
          </h3>
          <p className="text-ink-tertiary text-[13.5px]">{subtitle}</p>
        </div>
        <Segmented
          name="wizard-groomer-mode"
          label={words.title}
          value={mode}
          options={[
            { value: "earliest", label: words.earliest },
            { value: "choose", label: words.choose },
          ]}
          onChange={(next) => {
            setMode(next);
            if (next === "earliest") setChosenId(null);
            onChange({ date: value.date, start: null, groomerId: null });
          }}
        />
      </div>

      {mode === "earliest" && earliest ? (
        <div className="bg-acc-soft flex flex-wrap items-center gap-4 rounded-[20px] px-5 py-4">
          <div className="flex min-w-[220px] flex-1 flex-col gap-0.5">
            <span className="text-acc-soft-text text-[11.5px] font-bold tracking-[0.07em] uppercase">
              {t("wizEarliestOpening")}
            </span>
            <span className="text-body-ink text-[15.5px] font-semibold">
              {fill(
                t(
                  nameOf(earliest.offer.staffId)
                    ? "wizEarliestWith"
                    : "wizEarliestAt",
                ),
                {
                  date: formatWeekdayDate(earliest.date, locale),
                  time: time(earliest.offer.start),
                  groomer: shortPersonName(
                    nameOf(earliest.offer.staffId) ?? "",
                  ),
                },
              )}
            </span>
          </div>
          <Button
            type="button"
            size="mock-40"
            className="[--sh-cta:0_8px_20px_-8px_var(--acc-glow)]"
            onClick={() => pick(earliest.date, earliest.offer)}
          >
            {t("wizTakeThisSlot")}
          </Button>
        </div>
      ) : null}

      {mode === "choose" ? (
        <div className="flex flex-col gap-2.5">
          {able.length === 0 && !isPending ? (
            <p className="text-ink-secondary text-[13.5px]">
              {words.noneOnline}
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-2.5">
              {able
                .filter((g) => !isCustomer || g.name)
                .map((g) => {
                  const on = chosenId === g.id;
                  const next = nextFor(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={on}
                      data-on={on}
                      onClick={() => {
                        setChosenId(g.id);
                        onChange({
                          date: value.date,
                          start: null,
                          groomerId: g.id,
                        });
                      }}
                      className="mk-pick bg-card focus-visible:outline-primary flex min-w-0 items-center gap-3 rounded-[18px] px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
                    >
                      <PhotoPlaceholder
                        shape="circle"
                        initials={initialsOf(g.name ?? "")}
                      />
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className="text-body-ink text-[14.5px] font-semibold">
                          {g.name}
                        </span>
                        {g.role ? (
                          <span className="text-ink-tertiary truncate text-[12.5px]">
                            {g.role}
                          </span>
                        ) : null}
                        <span className="text-acc-deep text-[12px] font-semibold">
                          {next
                            ? fill(t("wizNextOpening"), {
                                date: formatWeekdayDate(next.date, locale),
                                time: time(next.start),
                              })
                            : t("wizNoOpenings")}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          )}
          {unable.length > 0 ? (
            <p className="text-ink-tertiary text-[12.5px]">
              {fill(
                t(unable.length > 1 ? "wizGroomersCannot" : "wizGroomerCannot"),
                {
                  names: formatList(
                    unable.map((g) => g.name ?? ""),
                    locale,
                  ),
                },
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-line bg-card flex flex-col gap-4 rounded-[22px] border p-[18px]">
        <div
          role="radiogroup"
          aria-label={t("wizGroomDay")}
          className="grid grid-cols-7 gap-1.5 pb-0.5 max-sm:grid-cols-[repeat(7,minmax(60px,1fr))] max-sm:overflow-x-auto"
        >
          {dates.map((date) => {
            const closed = shut(date) || (days.length > 0 && !working(date));
            const open = closed ? 0 : offersOn(date).length;
            const on = date === shownDate;
            const day = new Date(`${date}T12:00:00`);
            return (
              <button
                key={date}
                type="button"
                role="radio"
                aria-checked={on}
                aria-disabled={closed || undefined}
                data-on={on}
                data-closed={closed || undefined}
                data-full={(!closed && !isPending && open === 0) || undefined}
                onClick={() =>
                  !closed &&
                  onChange({
                    date,
                    start: null,
                    groomerId: mode === "choose" ? chosenId : null,
                  })
                }
                className="border-line bg-card text-body-ink focus-visible:outline-primary data-[on=true]:border-primary data-[on=true]:bg-primary data-[on=true]:text-primary-foreground flex flex-col items-center gap-0.5 rounded-[14px] border-[1.5px] px-1 py-[9px] focus-visible:outline-2 focus-visible:outline-offset-2 data-[closed=true]:cursor-not-allowed data-[closed=true]:opacity-45 data-[full=true]:opacity-45"
              >
                <span className="text-[11px] font-semibold uppercase opacity-80">
                  {formatWeekday(day.getDay(), locale, "short")}
                </span>
                <span className="text-[17px] font-bold tabular-nums">
                  {day.getDate()}
                </span>
                <span className="text-[10.5px] font-semibold opacity-85">
                  {closed
                    ? t("wizClosed")
                    : isPending
                      ? "…"
                      : open > 0
                        ? fill(t("wizNOpen"), { n: open })
                        : t("wizFull")}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-line-soft flex flex-col gap-2.5 border-t pt-3.5">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-body-ink text-[14px] font-semibold">
              {fill(chosen ? t("wizSlotsWith") : words.slotsAll, {
                date: formatWeekdayDate(shownDate, locale),
                groomer: shortPersonName(chosen?.name ?? ""),
              })}
            </span>
            <span className="text-ink-tertiary text-[12.5px]">
              {fill(t("wizEachSlotFits"), {
                total: formatDuration(total, locale),
              })}
            </span>
          </div>
          {isError ? (
            <p className="text-bad py-2.5 text-[13.5px]">
              {t("wizTimesNotLoaded")}
            </p>
          ) : mode === "choose" && !chosen ? (
            <p className="text-ink-tertiary py-2.5 text-[13.5px]">
              {words.chooseFirst}
            </p>
          ) : slots.length === 0 ? (
            <p className="text-ink-tertiary py-2.5 text-[13.5px]">
              {isPending ? t("wizFindingTimes") : t("wizNoOpeningsDay")}
            </p>
          ) : (
            <div
              role="radiogroup"
              aria-label={t("wizGroomTime")}
              className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-2 max-sm:grid-cols-[repeat(auto-fill,minmax(96px,1fr))]"
            >
              {slots.map((offer) => {
                const on =
                  value.date === shownDate &&
                  value.start === offer.start &&
                  (value.groomerId === offer.staffId || !value.groomerId);
                return (
                  <button
                    key={offer.start}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    data-on={on}
                    onClick={() => pick(shownDate, offer)}
                    className="border-line-strong bg-card text-body-ink focus-visible:outline-primary data-[on=true]:border-primary data-[on=true]:bg-primary data-[on=true]:text-primary-foreground flex flex-col items-center gap-px rounded-[14px] border px-1.5 py-[9px] focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    <span className="text-[14px] font-semibold tabular-nums">
                      {time(offer.start)}
                    </span>
                    {!chosen && nameOf(offer.staffId) ? (
                      <span className="text-[11.5px] opacity-80">
                        {shortPersonName(nameOf(offer.staffId) ?? "")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** People get initials (§5l): "Maya R." → "MR". */
function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

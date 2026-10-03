"use client";

import { Button } from "@/components/ui/button";
import { useEvaluationAvailability } from "@/lib/api/evaluation-availability";
import { isoDay } from "@/lib/bookings/wizard/calendar-month";
import { shortPersonName } from "@/lib/bookings/wizard/staff-slots";
import { hhmmOf } from "@/lib/bookings/wizard/time-windows";
import {
  earliestOpenDay,
  startTakes,
  type EvaluationDay,
  type EvaluationStart,
} from "@/lib/evaluations/availability";
import {
  formatTimeOfDay,
  formatWeekday,
  formatWeekdayDate,
} from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

import type { EvaluationSlot } from "./use-evaluation-booking";

// ============================================================================
// An evaluation's "Pick a date & time" (the client's mock, 2026-10-02):
//
//   EARLIEST OPENING  Fri, Oct 2                               [Jump there]
//   THU 1  FRI 2  SAT 3 …   21 days: "3 open" / Full / Closed
//   (certain days only)  Drop off between 8:00 AM and 10:30 AM · pick up …
//   MORNING     9:00 AM  2 of 2 left    11:00 AM  1 of 2 left
//   AFTERNOON   1:00 PM  Full           3:00 PM  2 of 2 left
//   EVALUATOR   ★ First available · Fastest booking   SJ Sarah Johnson …
//
// The times and places are the server's (`/api/…/evaluations/availability`),
// computed by the same rule the booking is re-checked by when it is saved.
// A named evaluator narrows the times to when they are free; "First
// available" leaves the booking for whoever starts it.
// ============================================================================

const STRIP_DAYS = 21;

export function EvaluationTimeStep({
  isCustomer,
  pets,
  value,
  onChange,
  excludeBookingIds,
}: {
  isCustomer: boolean;
  /** How many pets come to this evaluation. */
  pets: number;
  value: EvaluationSlot;
  onChange: (next: EvaluationSlot) => void;
  excludeBookingIds?: readonly string[];
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const today = isoDay(new Date());
  const { data, isPending, isError } = useEvaluationAvailability({
    asCustomer: isCustomer,
    from: today,
    days: STRIP_DAYS,
    pets,
    excludeBookingIds,
    enabled: pets > 0,
  });
  const days = data?.days ?? [];
  const evaluatorId = value.evaluatorId;
  const earliest = earliestOpenDay(days, pets, evaluatorId);
  const shown: EvaluationDay | undefined =
    days.find((day) => day.date === value.date && day.status !== "closed") ??
    earliest ??
    days[0];

  const time = (minutes: number) => formatTimeOfDay(hhmmOf(minutes), locale);
  const groupLabel = (group: string) => {
    if (group === "morning") return t("wizEvMorning");
    if (group === "afternoon") return t("wizEvAfternoon");
    if (group === "evening") return t("wizEvEvening");
    // A window the facility named: its own words (§5q).
    return data?.windows.find((w) => w.id === group)?.label ?? group;
  };
  const evaluatorName = (id: string | null) =>
    id ? (data?.evaluators.find((e) => e.id === id)?.name ?? null) : null;

  const pickDay = (date: string) =>
    onChange({ ...value, date, start: null, end: null });
  const pickStart = (day: EvaluationDay, start: EvaluationStart) =>
    onChange({
      ...value,
      date: day.date,
      start: start.start,
      end: start.end,
    });
  const pickEvaluator = (id: string | null) => {
    const current = shown?.starts.find((s) => s.start === value.start);
    const stillFree = current ? startTakes(current, pets, id) : false;
    onChange({
      ...value,
      evaluatorId: id,
      evaluatorName: evaluatorName(id),
      ...(stillFree ? {} : { start: null, end: null }),
    });
  };

  // Times grouped as the mock groups them: morning, afternoon, evening — or
  // the facility's own windows.
  const groups: Array<{ group: string; starts: EvaluationStart[] }> = [];
  for (const start of shown?.starts ?? []) {
    const last = groups.at(-1);
    if (last && last.group === start.group) last.starts.push(start);
    else groups.push({ group: start.group, starts: [start] });
  }
  const showLeft = data?.mode === "slots";
  const dropOff = data?.dropOff ?? null;

  return (
    <div className="flex flex-col gap-4">
      {earliest ? (
        // The evaluation mock's panel (2026-10-02): the accent's palest tint.
        <div className="flex flex-wrap items-center gap-2.5 rounded-[16px] border border-(--acc-line) bg-(--acc-pale) px-4 py-3">
          <span className="text-acc-soft-text text-[11px] font-bold tracking-[0.07em] uppercase">
            {t("wizEarliestOpening")}
          </span>
          <span className="text-body-ink min-w-0 flex-1 text-[14.5px] font-bold">
            {formatWeekdayDate(earliest.date, locale)}
          </span>
          <Button
            type="button"
            size="mock-34"
            className="font-bold [--sh-cta:none]"
            onClick={() => pickDay(earliest.date)}
          >
            {t("wizEvJumpThere")}
          </Button>
        </div>
      ) : null}

      <div
        role="radiogroup"
        aria-label={t("wizEvDay")}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1.5 [scrollbar-width:none]"
      >
        {days.map((day) => {
          const closed = day.status === "closed";
          const open = day.starts.filter((s) =>
            startTakes(s, pets, evaluatorId),
          ).length;
          const blocked = closed || open === 0;
          const on = day.date === shown?.date;
          const date = new Date(`${day.date}T12:00:00`);
          return (
            <button
              key={day.date}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={blocked || undefined}
              data-on={on}
              data-closed={blocked || undefined}
              onClick={() => !blocked && pickDay(day.date)}
              className="group border-line-strong text-body-ink focus-visible:outline-primary data-[closed=true]:bg-surface-inset-2 data-[closed=true]:text-ink-disabled data-[on=true]:border-primary data-[on=true]:bg-primary data-[on=true]:text-primary-foreground bg-card flex w-[74px] shrink-0 flex-col items-center gap-0.5 rounded-[16px] border py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 data-[closed=true]:cursor-not-allowed"
            >
              <span className="text-[11.5px] font-semibold">
                {formatWeekday(date.getDay(), locale, "short")}
              </span>
              <span className="text-[20px] font-extrabold tabular-nums">
                {date.getDate()}
              </span>
              <span
                data-free={(!blocked && !on) || undefined}
                className="data-[free=true]:text-success text-[10.5px] font-bold group-data-[on=true]:text-white/85"
              >
                {closed
                  ? t("wizClosed")
                  : open > 0
                    ? fill(t("wizNOpen"), { n: open })
                    : t("wizFull")}
              </span>
            </button>
          );
        })}
      </div>

      {dropOff && data ? (
        <p className="text-meta rounded-[14px] border border-(--note-line) bg-(--note-bg) px-3.5 py-3 text-(--note-ink)">
          {fill(t("wizEvDropOffNote"), {
            from: time(dropOff.start),
            to: time(dropOff.end),
            pickUp: time(dropOff.end + data.minutes),
          })}
        </p>
      ) : null}

      {isError ? (
        <p className="text-bad text-[13.5px]">{t("wizTimesNotLoaded")}</p>
      ) : groups.length === 0 ? (
        <p className="text-ink-tertiary text-[13.5px]">
          {isPending ? t("wizFindingTimes") : t("wizNoOpeningsDay")}
        </p>
      ) : (
        groups.map(({ group, starts }) => (
          <div key={group} className="flex flex-col gap-2">
            <span className="text-ink-tertiary text-[11px] font-bold tracking-[0.07em]">
              {groupLabel(group)}
            </span>
            <div
              role="radiogroup"
              aria-label={groupLabel(group)}
              className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2"
            >
              {starts.map((start) => {
                const takes = startTakes(start, pets, evaluatorId);
                const full = start.left < Math.max(1, pets);
                const on =
                  value.date === shown?.date && value.start === start.start;
                return (
                  <button
                    key={start.start}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-disabled={!takes || undefined}
                    data-on={on}
                    data-off={!takes || undefined}
                    onClick={() => takes && shown && pickStart(shown, start)}
                    className="border-line-strong text-body-ink focus-visible:outline-primary data-[off=true]:bg-surface-inset-2 data-[off=true]:text-ink-disabled data-[on=true]:border-primary data-[on=true]:bg-primary data-[on=true]:text-primary-foreground bg-card group flex min-h-[50px] flex-col items-center justify-center gap-px rounded-[14px] border px-1.5 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 data-[off=true]:cursor-not-allowed"
                  >
                    <span className="text-[15px] font-bold tabular-nums">
                      {time(start.start)}
                    </span>
                    {full ? (
                      <span className="text-[11px] font-semibold">
                        {t("wizFull")}
                      </span>
                    ) : !takes && evaluatorId ? (
                      <span className="text-[11px] font-semibold">
                        {fill(t("wizEvNotFree"), {
                          name: shortPersonName(
                            evaluatorName(evaluatorId) ?? "",
                          ),
                        })}
                      </span>
                    ) : showLeft ? (
                      <span
                        data-low={(start.left === 1 && !on) || undefined}
                        className="text-ink-tertiary data-[low=true]:text-warning text-[11px] font-semibold group-data-[on=true]:text-white/80"
                      >
                        {fill(t("wizEvLeft"), {
                          left: start.left,
                          capacity: start.capacity,
                        })}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}

      {data?.picksEvaluator && data.evaluators.length > 0 ? (
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-ink-tertiary text-[11px] font-bold tracking-[0.07em] uppercase">
            {t("wizEvEvaluator")}
          </span>
          <div
            role="radiogroup"
            aria-label={t("wizEvEvaluator")}
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-2"
          >
            {[
              {
                id: null,
                name: t("wizEvFirstAvailable"),
                role: t("wizEvFastest"),
              },
              ...data.evaluators,
            ].map((evaluator) => {
              const on = evaluatorId === evaluator.id;
              return (
                <button
                  key={evaluator.id ?? "any"}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-on={on}
                  onClick={() => pickEvaluator(evaluator.id)}
                  className="border-line-strong bg-card focus-visible:outline-primary data-[on=true]:border-primary flex min-w-0 items-center gap-2.5 rounded-[14px] border-[1.5px] px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 data-[on=true]:bg-(--acc-pale)"
                >
                  <span
                    aria-hidden
                    className="bg-surface-inset-2 text-body-ink flex size-[34px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                  >
                    {evaluator.id === null
                      ? "★"
                      : initialsOf(evaluator.name ?? "")}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-body-ink truncate text-[14px] font-semibold">
                      {evaluator.name}
                    </span>
                    {evaluator.role ? (
                      <span className="text-ink-tertiary truncate text-[12px]">
                        {evaluator.role}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** People get initials (§5l): "Sarah Johnson" → "SJ". */
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

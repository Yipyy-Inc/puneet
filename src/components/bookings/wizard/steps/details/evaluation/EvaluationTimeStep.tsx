"use client";

import { Clock, Star } from "lucide-react";

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
        <div className="border-line bg-card flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-5 py-3.5">
          <span className="text-micro text-primary-hover uppercase">
            {t("wizEarliestOpening")}
          </span>
          <span className="text-body-strong text-body-ink min-w-0 flex-1">
            {formatWeekdayDate(earliest.date, locale)}
          </span>
          <Button type="button" onClick={() => pickDay(earliest.date)}>
            {t("wizEvJumpThere")}
          </Button>
        </div>
      ) : null}

      <div
        role="radiogroup"
        aria-label={t("wizEvDay")}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1.5"
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
              className="border-line text-body-ink focus-visible:outline-primary data-[closed=true]:bg-surface-inset data-[closed=true]:text-ink-disabled data-[on=true]:bg-primary data-[on=true]:text-primary-foreground bg-card flex min-h-[72px] w-[74px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border px-1 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 data-[closed=true]:cursor-not-allowed data-[on=true]:border-transparent"
            >
              <span className="text-micro normal-case">
                {formatWeekday(date.getDay(), locale, "short")}
              </span>
              <span className="text-section tabular-nums">
                {date.getDate()}
              </span>
              <span className="text-micro normal-case">
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
        <p className="border-line bg-card text-meta text-body-ink flex gap-2.5 rounded-xl border px-4 py-3">
          <Clock
            aria-hidden
            className="text-ink-secondary mt-0.5 size-4 shrink-0"
          />
          {fill(t("wizEvDropOffNote"), {
            from: time(dropOff.start),
            to: time(dropOff.end),
            pickUp: time(dropOff.end + data.minutes),
          })}
        </p>
      ) : null}

      {isError ? (
        <p className="text-meta text-destructive">{t("wizTimesNotLoaded")}</p>
      ) : groups.length === 0 ? (
        <p className="text-meta text-ink-tertiary">
          {isPending ? t("wizFindingTimes") : t("wizNoOpeningsDay")}
        </p>
      ) : (
        groups.map(({ group, starts }) => (
          <div key={group} className="flex flex-col gap-2">
            <span className="text-micro text-ink-tertiary uppercase">
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
                    className="border-line text-body-ink focus-visible:outline-primary data-[off=true]:bg-surface-inset data-[off=true]:text-ink-disabled data-[on=true]:bg-primary data-[on=true]:text-primary-foreground bg-card flex min-h-[50px] flex-col items-center justify-center gap-px rounded-xl border px-1.5 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 data-[off=true]:cursor-not-allowed data-[on=true]:border-transparent max-lg:min-h-12"
                  >
                    <span className="text-body-strong tabular-nums">
                      {time(start.start)}
                    </span>
                    {full ? (
                      <span className="text-micro normal-case">
                        {t("wizFull")}
                      </span>
                    ) : !takes && evaluatorId ? (
                      <span className="text-micro normal-case">
                        {fill(t("wizEvNotFree"), {
                          name: shortPersonName(
                            evaluatorName(evaluatorId) ?? "",
                          ),
                        })}
                      </span>
                    ) : showLeft ? (
                      <span
                        data-low={start.left === 1 || undefined}
                        className="text-micro data-[low=true]:text-warning normal-case"
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
          <span className="text-micro text-ink-tertiary uppercase">
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
                  className="border-line-strong bg-card hover:border-ink-disabled focus-visible:outline-primary flex min-h-12 min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-[box-shadow,border-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] motion-reduce:transition-none"
                >
                  <span
                    aria-hidden
                    className="bg-surface-inset text-body-ink flex size-[34px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                  >
                    {evaluator.id === null ? (
                      <Star className="size-4" />
                    ) : (
                      initialsOf(evaluator.name ?? "")
                    )}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-body-strong text-body-ink truncate">
                      {evaluator.name}
                    </span>
                    {evaluator.role ? (
                      <span className="text-meta text-ink-tertiary truncate">
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

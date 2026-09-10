"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Clock,
  Droplets,
  Footprints,
  Pill,
  Sparkles,
  Utensils,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  formatDateLong,
  formatDateShort,
  formatTimeOfDay,
} from "@/lib/i18n/format";
import type { CareLogEntry } from "@/lib/api/care-log";
import type { Booking } from "@/types/booking";

// ============================================================================
// A stay's journal, from what staff actually logged.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// The journal this page showed before read the `boardingGuests` FIXTURE, and
// matched a real booking to a fixture guest by pet — so a December stay
// displayed somebody else's April, with eight days of meals "Ate all" that
// never happened (fixed 2026-08-19 by showing nothing). Since then the feeding
// and medication panels have written every meal and dose to
// `care_log_entries`, and this is the journal built from those rows.
//
// Each day lists what the owner's schedule PLANNED (meals, doses) beside what
// was LOGGED, keyed the way the panels log them — `sched-<item>-<occasion>`
// for a meal, `<medication>#HH:MM` for a dose — plus anything else logged that
// day (a potty break, a walk from the Daily Care board). A planned item with no
// row is "not logged"; on a future day it is simply planned.
// ============================================================================

type Row = {
  key: string;
  taskType: string;
  label: string;
  time: string;
  entry?: CareLogEntry;
};

const ICON: Record<string, typeof Utensils> = {
  feeding: Utensils,
  medication: Pill,
  potty: Droplets,
  walk: Footprints,
  cleaning: Sparkles,
};

/** A task type's name, by catalogue key, for rows the schedule did not plan. */
const TASK_KEY: Record<string, string> = {
  feeding: "journalTaskFeeding",
  medication: "journalTaskMedication",
  potty: "journalTaskPotty",
  walk: "journalTaskWalk",
  cleaning: "journalTaskCleaning",
  addon: "journalTaskAddon",
  other: "journalTaskOther",
};

/** An outcome's words, by catalogue key; an unknown one is shown as stored. */
const OUTCOME_KEY: Record<string, string> = {
  ate_all: "journalOutcomeAteAll",
  ate_most: "journalOutcomeAteMost",
  ate_some: "journalOutcomeAteSome",
  ate_little: "journalOutcomeAteLittle",
  refused: "journalOutcomeRefused",
  served: "journalOutcomeServed",
  given: "journalOutcomeGiven",
  skipped: "journalOutcomeSkipped",
  vomited: "journalOutcomeVomited",
  pee: "journalOutcomePee",
  poop: "journalOutcomePoop",
  both: "journalOutcomeBoth",
  nothing: "journalOutcomeNothing",
  completed: "journalOutcomeCompleted",
  issue_reported: "journalOutcomeIssue",
};

/** Every date from `start` to `end`, inclusive, as YYYY-MM-DD. */
function daysOf(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end || start}T12:00:00Z`);
  while (d <= last && out.length < 120) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function BookingJournal({
  booking,
  petName,
  careLog,
}: {
  booking: Booking;
  petName: string;
  careLog: CareLogEntry[] | undefined;
}) {
  const { t, fill, locale } = useStaffText("bookingDetail");
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const days = useMemo(
    () => daysOf(booking.startDate, booking.endDate ?? booking.startDate),
    [booking.startDate, booking.endDate],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const day =
    picked ?? (days.includes(today) ? today : (days[days.length - 1] ?? today));

  // What the owner's schedule asks for, every day of the stay.
  const planned = useMemo(() => {
    const meals: Omit<Row, "entry">[] = (booking.feedingSchedule ?? []).flatMap(
      (item) =>
        item.occasions.map((occasion) => ({
          key: `sched-${item.id}-${occasion.id}`,
          taskType: "feeding",
          label: occasion.label,
          time: occasion.time,
        })),
    );
    const doses: Omit<Row, "entry">[] = (booking.medications ?? []).flatMap(
      (med) =>
        med.times.map((time) => ({
          key: `${med.id}#${time.slice(0, 5)}`,
          taskType: "medication",
          label: [med.name, med.amount, med.strength].filter(Boolean).join(" "),
          time,
        })),
    );
    return [...meals, ...doses];
  }, [booking.feedingSchedule, booking.medications]);

  const log = useMemo(() => careLog ?? [], [careLog]);
  const labelFor = (entry: CareLogEntry) =>
    planned.find((p) => p.key === entry.taskKey)?.label ??
    t(TASK_KEY[entry.taskType] ?? "journalTaskOther");

  const rows: Row[] = useMemo(() => {
    const onDay = log.filter((e) => e.occurredOn === day);
    const fromPlan = planned.map((p) => ({
      ...p,
      entry: onDay.find((e) => e.taskKey === p.key),
    }));
    const extra = onDay
      .filter((e) => !planned.some((p) => p.key === e.taskKey))
      .map((e) => ({
        key: e.id,
        taskType: e.taskType,
        label: t(TASK_KEY[e.taskType] ?? "journalTaskOther"),
        time: e.executedAt,
        entry: e,
      }));
    return [...fromPlan, ...extra].sort((a, b) => a.time.localeCompare(b.time));
  }, [log, planned, day, t]);

  const logged = rows.filter((r) => r.entry).length;
  const activity = [...log].sort((a, b) =>
    `${b.occurredOn}T${b.executedAt}`.localeCompare(
      `${a.occurredOn}T${a.executedAt}`,
    ),
  );

  const outcomeLabel = (entry: CareLogEntry) =>
    OUTCOME_KEY[entry.outcome]
      ? t(OUTCOME_KEY[entry.outcome])
      : entry.outcome.replace(/_/g, " ");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="size-4" />
          {fill("journalTitle", { pet: petName })}
          <Badge variant="outline" className="ml-auto gap-1 text-xs">
            <ClipboardList className="size-3" />
            {fill(days.length === 1 ? "journalDayOne" : "journalDays", {
              n: days.length,
            })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Day chips — horizontal scroll rather than wrap past a week. */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {days.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setPicked(d)}
              aria-pressed={d === day}
              className={cn(
                "min-h-10 shrink-0 rounded-full border px-3 text-xs font-medium tabular-nums",
                d === day
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted",
              )}
            >
              {fill("journalDayChip", {
                n: i + 1,
                date: formatDateShort(d, locale),
              })}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{formatDateLong(day, locale)}</p>
          <span className="text-muted-foreground text-xs tabular-nums">
            {fill("journalLoggedOf", { done: logged, total: rows.length })}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
            {t("journalNothingPlanned")}
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const Icon = ICON[row.taskType] ?? ClipboardList;
              const done = Boolean(row.entry);
              const future = day > today;
              return (
                <li
                  key={row.key}
                  className="flex min-h-12 items-start gap-3 rounded-xl border px-3 py-2"
                >
                  <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatTimeOfDay(row.time.slice(0, 5), locale)}
                      {row.entry?.recordedByName
                        ? ` · ${row.entry.recordedByName}`
                        : ""}
                      {row.entry?.notes ? ` · ${row.entry.notes}` : ""}
                    </p>
                  </div>
                  {done ? (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Check className="size-3" />
                      {outcomeLabel(row.entry!)}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground gap-1 text-xs"
                    >
                      <Clock className="size-3" />
                      {future ? t("journalPlanned") : t("journalNotLogged")}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-2 border-t pt-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            {fill("journalActivity", { n: activity.length })}
          </p>
          {activity.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("journalNoActivity")}
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {activity.slice(0, 12).map((entry) => (
                <li key={entry.id} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {formatDateLong(entry.occurredOn, locale)} ·{" "}
                    {formatTimeOfDay(entry.executedAt, locale)}
                  </span>
                  <span className="min-w-0 truncate">
                    {labelFor(entry)} — {outcomeLabel(entry)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import type { CareLogEntry } from "@/lib/api/care-log";
import { medicationTaskKey } from "@/lib/bookings/care-instructions";
import type { FeedingEntry, MedicationEntry } from "@/types/booking";

import { journalKind, type JournalKind } from "./service-view";

// ============================================================================
// One day of a stay or a visit, as the booking page's journal shows it (the
// client's Guest journal and Daily log, 2026-10-03): what was PLANNED for the
// day, beside what was LOGGED.
//
// Planned rows come from four places, each under the task key the screen that
// already logs it uses — so a meal logged here is the meal the care gate looks
// for, and a potty break logged on the Daily Care board shows here:
//
//   meals    the owner's feeding plan     `sched-<plan>-<meal>` (the panels' key)
//   doses    the owner's medications      `<medication>#HH:MM`
//   potty    the facility's routine       `potty-<booking>-<step>` (the board's)
//   add-ons  the booking's add-ons, at    `addon-<booking>-<line>` (the board's)
//            the routine's add-on time
//
// Anything else logged that day — a walk from "+ Log activity", a round from
// the board — is its own row, so nothing logged ever goes missing. On the
// first and last day of a stay, and on a day of daycare, the routine only
// counts inside the booking's own hours.
// ============================================================================

export type JournalTaskType =
  | "feeding"
  | "medication"
  | "potty"
  | "addon"
  | "walk"
  | "cleaning"
  | "other";

export interface RoutineStep {
  id: string;
  name: string;
  time: string;
  taskType: string;
  enabled: boolean;
  description?: string;
}

export interface JournalRow {
  /** The task key it logs under. */
  key: string;
  taskType: JournalTaskType;
  kind: JournalKind;
  /** HH:MM on the facility's clock. */
  time: string;
  title: string;
  detail: string;
  entry: CareLogEntry | null;
  /** False for an entry nobody planned (an ad-hoc log). */
  planned: boolean;
  /** The plan's meal or medication, so a screen can word it fully. */
  meal?: FeedingEntry;
  medication?: MedicationEntry;
}

/** Every day from `start` to `end`, inclusive, as YYYY-MM-DD (at most 120). */
export function journalDays(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end || start}T12:00:00Z`);
  while (d <= last && out.length < 120) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const hhmm = (value: string) =>
  value.includes("T") ? value.slice(11, 16) : value.slice(0, 5);

const inside = (time: string, window: { from?: string; to?: string }) =>
  (!window.from || time >= window.from) && (!window.to || time <= window.to);

export function planDay(input: {
  bookingRef: number;
  day: string;
  feeding: readonly FeedingEntry[];
  medication: readonly MedicationEntry[];
  routine: readonly RoutineStep[];
  addOns: readonly { id: string; name: string }[];
  /** The hours the pet is here on this day; absent ends are open. */
  window: { from?: string; to?: string };
  log: readonly CareLogEntry[];
  labels: {
    addOn: string;
    byType: (taskType: string) => string;
  };
}): JournalRow[] {
  const onDay = input.log.filter((e) => e.occurredOn === input.day);
  const find = (key: string) => onDay.find((e) => e.taskKey === key) ?? null;
  const rows: JournalRow[] = [];

  for (const meal of input.feeding) {
    rows.push({
      key: meal.id,
      taskType: "feeding",
      kind: "meal",
      time: hhmm(meal.time),
      title: meal.label,
      detail: [meal.amount, meal.foodType].filter(Boolean).join(" "),
      entry: find(meal.id),
      planned: true,
      meal,
    });
  }

  for (const med of input.medication) {
    for (const dose of med.doses) {
      const key = medicationTaskKey(med.id, dose.scheduledAt);
      rows.push({
        key,
        taskType: "medication",
        kind: "med",
        time: hhmm(dose.scheduledAt),
        title: [med.name, med.dosage].filter(Boolean).join(" "),
        detail: med.instructions ?? "",
        entry: find(key),
        planned: true,
        medication: med,
      });
    }
  }

  const steps = input.routine.filter(
    (s) => s.enabled && inside(hhmm(s.time), input.window),
  );
  for (const step of steps.filter((s) => s.taskType === "potty")) {
    const key = `potty-${input.bookingRef}-${step.id}`;
    rows.push({
      key,
      taskType: "potty",
      kind: "potty",
      time: hhmm(step.time),
      title: step.name,
      detail: step.description ?? "",
      entry: find(key),
      planned: true,
    });
  }

  // Add-ons run at the routine's add-on round; with none, they are logged
  // when they happen (+ Log activity), not planned at a guessed time.
  const addOnStep = steps.find((s) => s.taskType === "addon");
  if (addOnStep) {
    for (const addOn of input.addOns) {
      const key = `addon-${input.bookingRef}-${addOn.id}`;
      rows.push({
        key,
        taskType: "addon",
        kind: "activity",
        time: hhmm(addOnStep.time),
        title: addOn.name,
        detail: input.labels.addOn,
        entry: find(key),
        planned: true,
      });
    }
  }

  const plannedKeys = new Set(rows.map((r) => r.key));
  for (const entry of onDay) {
    if (plannedKeys.has(entry.taskKey)) continue;
    rows.push({
      key: entry.taskKey,
      taskType: entry.taskType as JournalTaskType,
      kind: journalKind(entry.taskType),
      time: hhmm(entry.executedAt),
      title: input.labels.byType(entry.taskType),
      detail: entry.notes ?? "",
      entry,
      planned: false,
    });
  }

  return rows.sort((a, b) => a.time.localeCompare(b.time));
}

/** "2 of 3 logged": what is planned that day and how much of it is done. */
export function dayProgress(rows: readonly JournalRow[]) {
  const planned = rows.filter((r) => r.planned);
  return {
    logged: planned.filter((r) => r.entry).length,
    total: planned.length,
  };
}

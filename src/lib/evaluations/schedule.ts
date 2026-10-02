import { minutesOf } from "@/lib/bookings/wizard/time-windows";
import type { EvaluationConfig } from "@/types/facility";

// ============================================================================
// How a facility offers evaluations — the client's setup page (2026-10-02):
//
//   STEP 1  How do you offer evaluations?
//           Any day, any time · Set days & hours · Certain days only · Fixed slots
//   STEP 2  When — days, a start range or a drop-off window, named windows or
//           fixed start times, session length, pets at the same time, buffer,
//           minimum notice, book up to
//
// `evaluation_config` stores it in the shape it grew up with (`slotMode`
// fixed | window, "monday" weekday names, "HH:MM" strings). This is the one
// reading of it that the booking wizard, the server's availability and the
// settings page's "What clients will see" preview all share, so the three
// cannot disagree about when an evaluation can start.
// ============================================================================

export type OfferMode = "any" | "window" | "days" | "slots";

export const OFFER_MODES: readonly OfferMode[] = [
  "any",
  "window",
  "days",
  "slots",
];

/** The session lengths the setup page offers, in minutes. */
export const SESSION_LENGTHS = [30, 45, 60, 90, 120, 240] as const;

/** `allowedDays` as `evaluation_config` stores them, Sunday first. */
export const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** `dailyPetLimits.perDay` keys, Sunday first. */
const LIMIT_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export interface EvaluationWindow {
  id: string;
  label: string;
  /** Minutes from midnight. */
  start: number;
  end: number;
}

export interface EvaluationSchedule {
  mode: OfferMode;
  /**
   * Weekdays evaluations run, 0 = Sunday. Not read for "any", which follows
   * the facility's own open days.
   */
  weekdays: number[];
  /**
   * "any": when an evaluation may start. "days": the drop-off window.
   * Minutes from midnight.
   */
  openRange: { start: number; end: number };
  windows: EvaluationWindow[];
  /** "slots": the start times, minutes from midnight, sorted. */
  slots: number[];
  /** The session's length. */
  minutes: number;
  /** Pets at the same time. */
  capacity: number;
  /** Minutes kept clear between one evaluation and the next. */
  buffer: number;
  /** Pets a day can take, by weekday (0 = Sunday); null when unlimited. */
  dailyLimits: Record<number, number> | null;
  /** A customer's minimum notice, in hours. */
  noticeHours: number;
  /** How many days ahead a customer may book; null when unlimited. */
  aheadDays: number | null;
}

export const DEFAULT_OPEN_RANGE = { start: 8 * 60, end: 18 * 60 };

/** "Fixed slots" when the stored config predates the setup page. */
export function offerModeOf(config: EvaluationConfig): OfferMode {
  const stored = config.schedule.offerMode;
  if (stored && OFFER_MODES.includes(stored)) return stored;
  return config.schedule.slotMode === "window" ? "window" : "slots";
}

/** The session length: the one the facility chose, else its first option. */
export function sessionMinutesOf(config: EvaluationConfig): number {
  const chosen =
    config.schedule.defaultDurationMinutes ??
    config.schedule.durationOptionsMinutes[0];
  return chosen && chosen > 0 ? chosen : 60;
}

function weekdaysOf(config: EvaluationConfig): number[] {
  const named = config.schedule.allowedDays ?? [];
  // Nothing saved means nothing restricted — how the old screen read it.
  if (named.length === 0) return [0, 1, 2, 3, 4, 5, 6];
  const days = named
    .map((name) =>
      WEEKDAY_NAMES.indexOf(
        name.toLowerCase() as (typeof WEEKDAY_NAMES)[number],
      ),
    )
    .filter((day) => day >= 0);
  return [...new Set(days)].sort((a, b) => a - b);
}

function rangeOf(config: EvaluationConfig): { start: number; end: number } {
  const range = config.schedule.openRange;
  const start = minutesOf(range?.start);
  const end = minutesOf(range?.end);
  return start !== null && end !== null && end > start
    ? { start, end }
    : DEFAULT_OPEN_RANGE;
}

function limitsOf(config: EvaluationConfig): Record<number, number> | null {
  const limits = config.dailyPetLimits;
  if (!limits?.enabled) return null;
  const out: Record<number, number> = {};
  LIMIT_KEYS.forEach((key, weekday) => {
    const value = limits.perDay?.[key] ?? limits.defaultLimit;
    if (typeof value === "number" && value >= 0) out[weekday] = value;
  });
  return out;
}

/** The stored config, read once into the shape every caller shares. */
export function evaluationSchedule(
  config: EvaluationConfig,
): EvaluationSchedule {
  const windows = config.schedule.timeWindows
    .map((w) => ({
      id: w.id,
      label: w.label,
      start: minutesOf(w.startTime),
      end: minutesOf(w.endTime),
    }))
    .filter(
      (w): w is EvaluationWindow =>
        w.start !== null && w.end !== null && w.end > w.start,
    );
  const slots = [
    ...new Set(
      config.schedule.fixedStartTimes
        .map((time) => minutesOf(time))
        .filter((m): m is number => m !== null),
    ),
  ].sort((a, b) => a - b);
  return {
    mode: offerModeOf(config),
    weekdays: weekdaysOf(config),
    openRange: rangeOf(config),
    windows,
    slots,
    minutes: sessionMinutesOf(config),
    capacity: Math.max(1, Math.floor(config.schedule.capacityPerSlot ?? 1)),
    buffer: Math.max(0, config.schedule.bufferMinutes ?? 0),
    dailyLimits: limitsOf(config),
    noticeHours: Math.max(0, config.minLeadTimeHours ?? 0),
    aheadDays:
      config.maxAdvanceDays && config.maxAdvanceDays > 0
        ? config.maxAdvanceDays
        : null,
  };
}

/** Morning before noon, afternoon before 5 PM, then evening (the mock's groups). */
export function partOfDay(
  minutes: number,
): "morning" | "afternoon" | "evening" {
  if (minutes < 12 * 60) return "morning";
  if (minutes < 17 * 60) return "afternoon";
  return "evening";
}

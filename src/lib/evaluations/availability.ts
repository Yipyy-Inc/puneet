import type { TimeWindow } from "@/lib/bookings/wizard/time-windows";
import { partOfDay, type EvaluationSchedule } from "@/lib/evaluations/schedule";

// ============================================================================
// When an evaluation can start on a day — the wizard's "Pick a date & time"
// (the client's mock, 2026-10-02):
//
//   EARLIEST OPENING  Fri 2 Oct                              [Jump there]
//   THU 1   FRI 2    SAT 3   …        21 days: "3 open" / Full / Closed
//   MORNING    9:00 AM (2 of 2 left)   11:00 AM (1 of 2 left)
//   AFTERNOON  1:00 PM (Full)          3:00 PM (2 of 2 left)
//   EVALUATOR  First available · Sarah Johnson · Emily Davis …
//
// One rule for the strip, the chips, the earliest opening, the server's
// answer to a customer (counts only, never who is booked) and the re-check a
// booking makes before it is written — so a time a client was shown is the
// time the server will take.
//
//   any      starts every 30 minutes inside the start range and the
//            facility's opening hours, on the days it is open
//   window   starts every 30 minutes that leave the session inside one of
//            the named windows, on the chosen weekdays
//   days     a drop-off time in the drop-off window; the evaluation runs for
//            the whole day, so every pet that day shares the places
//   slots    the fixed start times
//
// "Pets at the same time" is the facility's: an evaluation holds its pets'
// places from its start to its end plus the buffer. An evaluator is a
// preference, not a place — "First available" leaves the booking for whoever
// starts it; a named evaluator narrows the starts to when they are free.
// ============================================================================

export const START_STEP = 30;

export interface BookedEvaluation {
  /** Minutes from midnight; `end` is capped at 24:00. */
  start: number;
  end: number;
  /** How many pets it holds. */
  pets: number;
}

export interface EvaluatorDay {
  id: string;
  /** When they work that day. Empty: off. */
  working: readonly TimeWindow[];
  /** What else holds them that day — appointments of other services. */
  busy: readonly TimeWindow[];
}

export interface EvaluationStart {
  /** Minutes from midnight. */
  start: number;
  /** Its end: the session, or for "certain days" the pick-up time. */
  end: number;
  /** Places left, before this booking's pets. */
  left: number;
  capacity: number;
  /** The window's id ("window"), else "morning" | "afternoon" | "evening". */
  group: string;
  /** Evaluators free for the whole of it. */
  evaluatorIds: string[];
}

export type EvaluationDayStatus = "open" | "full" | "closed";

export interface EvaluationDay {
  date: string;
  status: EvaluationDayStatus;
  starts: EvaluationStart[];
  /** Starts with room for this booking's pets. */
  open: number;
}

export interface DayContext {
  /** YYYY-MM-DD, the facility's day. */
  date: string;
  /** 0 = Sunday. */
  weekday: number;
  /** Shut for evaluations: a holiday, a closure, outside a booking window. */
  closed: boolean;
  /**
   * The facility's opening hours that day: null when its hours say closed,
   * undefined when it has set none.
   */
  hours?: TimeWindow | null;
  booked: readonly BookedEvaluation[];
  /** Starts before this are dropped (today: now, plus a customer's notice). */
  notBefore?: number;
  evaluators?: readonly EvaluatorDay[];
}

/** 0 = Sunday, for a YYYY-MM-DD day — read at noon UTC so no zone moves it. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Whether evaluations run on this day at all, before any booking. */
export function dayOffered(
  schedule: EvaluationSchedule,
  context: Pick<DayContext, "closed" | "weekday" | "hours">,
): boolean {
  if (context.closed) return false;
  // "Any day, any time" follows the facility's own open days.
  if (schedule.mode === "any") return context.hours !== null;
  return schedule.weekdays.includes(context.weekday);
}

interface Candidate {
  start: number;
  end: number;
  group: string;
}

function candidates(
  schedule: EvaluationSchedule,
  hours: TimeWindow | null | undefined,
): Candidate[] {
  const minutes = schedule.minutes;
  const out: Candidate[] = [];
  const seen = new Set<number>();
  const push = (start: number, end: number, group: string) => {
    if (seen.has(start)) return;
    seen.add(start);
    out.push({ start, end: Math.min(end, 24 * 60), group });
  };
  switch (schedule.mode) {
    case "any": {
      // "Evaluations can start between" the range, and the whole session
      // inside opening hours where the facility has set them.
      const first = Math.max(schedule.openRange.start, hours?.start ?? 0);
      const last = Math.min(
        schedule.openRange.end,
        hours ? hours.end - minutes : schedule.openRange.end,
      );
      for (let t = first; t <= last; t += START_STEP) {
        push(t, t + minutes, partOfDay(t));
      }
      break;
    }
    case "window": {
      for (const window of schedule.windows) {
        for (let t = window.start; t + minutes <= window.end; t += START_STEP) {
          push(t, t + minutes, window.id);
        }
      }
      break;
    }
    case "days": {
      // A drop-off time; the evaluation runs once everyone is in, so the
      // pick-up is the window's end plus the session.
      const pickUp = schedule.openRange.end + minutes;
      for (
        let t = schedule.openRange.start;
        t <= schedule.openRange.end;
        t += START_STEP
      ) {
        push(t, pickUp, partOfDay(t));
      }
      break;
    }
    case "slots": {
      for (const t of schedule.slots) push(t, t + minutes, partOfDay(t));
      break;
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

function petsHeld(
  schedule: EvaluationSchedule,
  booked: readonly BookedEvaluation[],
  candidate: Candidate,
): number {
  if (schedule.mode === "days") {
    // The whole day is one evaluation: every pet that day shares it.
    return booked.reduce((sum, b) => sum + b.pets, 0);
  }
  const buffer = schedule.buffer;
  return booked
    .filter(
      (b) =>
        candidate.start < b.end + buffer && b.start < candidate.end + buffer,
    )
    .reduce((sum, b) => sum + b.pets, 0);
}

function evaluatorsFree(
  evaluators: readonly EvaluatorDay[],
  candidate: Candidate,
): string[] {
  return evaluators
    .filter(
      (e) =>
        e.working.some(
          (w) => w.start <= candidate.start && candidate.end <= w.end,
        ) &&
        !e.busy.some((b) => b.start < candidate.end && candidate.start < b.end),
    )
    .map((e) => e.id);
}

/**
 * One day of the strip: every start (full ones too, so a chip can say
 * "Full"), and how many can take `pets` more.
 */
export function evaluationDay(
  schedule: EvaluationSchedule,
  context: DayContext,
  pets: number,
): EvaluationDay {
  const closed: EvaluationDay = {
    date: context.date,
    status: "closed",
    starts: [],
    open: 0,
  };
  if (!dayOffered(schedule, context)) return closed;

  const notBefore = context.notBefore;
  const list = candidates(schedule, context.hours).filter(
    (c) => notBefore === undefined || c.start >= notBefore,
  );
  // A day whose every start has passed, or is too soon, cannot be booked.
  if (list.length === 0) return closed;

  const limit = schedule.dailyLimits?.[context.weekday];
  const dayPets = context.booked.reduce((sum, b) => sum + b.pets, 0);
  const dayLeft =
    limit === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(0, limit - dayPets);

  const starts = list.map((candidate) => {
    const held = petsHeld(schedule, context.booked, candidate);
    return {
      start: candidate.start,
      end: candidate.end,
      left: Math.min(Math.max(0, schedule.capacity - held), dayLeft),
      capacity: schedule.capacity,
      group: candidate.group,
      evaluatorIds: evaluatorsFree(context.evaluators ?? [], candidate),
    };
  });
  const need = Math.max(1, pets);
  const open = starts.filter((s) => s.left >= need).length;
  return {
    date: context.date,
    status: open > 0 ? "open" : "full",
    starts,
    open,
  };
}

/** Whether a start can take `pets` (and the chosen evaluator, if any). */
export function startTakes(
  start: EvaluationStart,
  pets: number,
  evaluatorId?: string | null,
): boolean {
  if (start.left < Math.max(1, pets)) return false;
  return !evaluatorId || start.evaluatorIds.includes(evaluatorId);
}

/** The first day with a start that takes the booking — "EARLIEST OPENING". */
export function earliestOpenDay(
  days: readonly EvaluationDay[],
  pets: number,
  evaluatorId?: string | null,
): EvaluationDay | null {
  return (
    days.find((day) =>
      day.starts.some((s) => startTakes(s, pets, evaluatorId)),
    ) ?? null
  );
}

/**
 * The start a booking asks for, re-checked the way the strip showed it:
 * null when it is not offered or has no room left.
 */
export function startFor(
  day: EvaluationDay,
  start: number,
  pets: number,
  evaluatorId?: string | null,
): EvaluationStart | null {
  const found = day.starts.find((s) => s.start === start) ?? null;
  return found && startTakes(found, pets, evaluatorId) ? found : null;
}

import type { TimeWindow } from "@/lib/bookings/wizard/time-windows";

// ============================================================================
// "Groomer & time" / "Trainer & time" (the client's mock, 2026-10-01): which
// start times a groomer or trainer can take an appointment of a given length.
//
//   EARLIEST OPENING   Thu, Oct 1 · 11:00 AM with Maya R.   [Take this slot]
//   THU 1  FRI 2  SAT 3  SUN 4 …                 14 days: "N open" / Full / Closed
//   9:00 AM  9:30 AM  11:00 AM …                 "Each slot fits 3h 45m"
//
// A start fits when the WHOLE appointment — every pet back to back, add-ons
// included — lies inside one of the person's working windows that day and
// clears every interval they are already busy. Starts are on the step (30
// minutes in the mock), from the window's opening.
//
// Pure, so the strip, the earliest opening and the slot grid are one rule,
// and so the server's answer for a customer (open starts only, never who is
// busy) is this same function run over the same rows.
// ============================================================================

export interface StaffDay {
  staffId: string;
  /** When they work that day, minutes from midnight. Empty: not working. */
  working: readonly TimeWindow[];
  /** Appointments and blocks they already have that day. */
  busy: readonly TimeWindow[];
}

export interface SlotOffer {
  /** Minutes from midnight. */
  start: number;
  staffId: string;
}

export type StripStatus = "open" | "full" | "closed";

export interface StripDay {
  date: string;
  status: StripStatus;
  /** How many starts are open; 0 when full or closed. */
  open: number;
}

/** Whether `start`…`start + duration` overlaps `busy`. Touching is not overlapping. */
function overlaps(start: number, duration: number, busy: TimeWindow): boolean {
  return start < busy.end && start + duration > busy.start;
}

/**
 * Every start on the step at which `duration` fits one working window and
 * clears every busy interval. `notBefore` drops starts already past (today).
 */
export function fittingStarts(
  day: Pick<StaffDay, "working" | "busy">,
  duration: number,
  step = 30,
  notBefore?: number,
): number[] {
  if (!(duration > 0) || !(step > 0)) return [];
  const out = new Set<number>();
  for (const window of day.working) {
    for (let t = window.start; t + duration <= window.end; t += step) {
      if (notBefore !== undefined && t < notBefore) continue;
      if (day.busy.some((busy) => overlaps(t, duration, busy))) continue;
      out.add(t);
    }
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * One day, a pool of people: each start once, with the first person in the
 * pool's order who is free at it — "11:00 AM · Maya R.". The pool's order is
 * the caller's (the facility's own staff order).
 */
export function poolSlots(
  days: readonly StaffDay[],
  duration: number,
  step = 30,
  notBefore?: number,
): SlotOffer[] {
  const byStart = new Map<number, string>();
  for (const day of days) {
    for (const start of fittingStarts(day, duration, step, notBefore)) {
      if (!byStart.has(start)) byStart.set(start, day.staffId);
    }
  }
  return [...byStart.entries()]
    .sort(([a], [b]) => a - b)
    .map(([start, staffId]) => ({ start, staffId }));
}

/**
 * The strip: CLOSED where nobody in the pool works that day (the facility is
 * shut, or the chosen person is off), FULL where they work but nothing fits,
 * else how many starts are open.
 */
export function stripDay(
  date: string,
  days: readonly StaffDay[],
  duration: number,
  step = 30,
  notBefore?: number,
): StripDay {
  const working = days.some((day) => day.working.length > 0);
  if (!working) return { date, status: "closed", open: 0 };
  const open = poolSlots(days, duration, step, notBefore).length;
  return { date, status: open > 0 ? "open" : "full", open };
}

/** The first open start across the dates, in order — the "Earliest opening". */
export function earliestOpening(
  dates: readonly string[],
  slotsOn: (date: string) => readonly SlotOffer[],
): { date: string; offer: SlotOffer } | null {
  for (const date of dates) {
    const offer = slotsOn(date)[0];
    if (offer) return { date, offer };
  }
  return null;
}

/** The pets' appointments end to end: "groomed back-to-back · 3h 45m total". */
export function backToBack(minutes: readonly number[]): number {
  return minutes.reduce((sum, m) => sum + Math.max(0, m), 0);
}

/** The ISO day `count` days from `from` (YYYY-MM-DD), for the 14-day strip. */
export function nextDays(from: string, count: number): string[] {
  const [y, m, d] = from.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(Date.UTC(y!, m! - 1, d! + i));
    out.push(date.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * "Jessica Martinez" → "Jessica M.": how the wizard names a groomer or a
 * trainer beside a slot or a class (the client's mock). A name already
 * shortened, or one word long, is left as it is.
 */
export function shortPersonName(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return name.trim();
  const last = words[words.length - 1]!;
  return last.endsWith(".") ? name.trim() : `${words[0]} ${last.charAt(0)}.`;
}

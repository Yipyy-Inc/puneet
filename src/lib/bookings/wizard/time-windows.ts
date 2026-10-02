import {
  facilityDateKey,
  facilityHoursForDate,
  type DayOverride,
  type WeeklyHours,
} from "@/lib/settings/facility-hours";
import {
  standingHours,
  type ServiceTimeWindows,
} from "@/lib/settings/service-time-windows";

// ============================================================================
// Drop-off and pick-up times in the booking wizard (the client's mock,
// 2026-10-01; the client: "the times it shows for drop off and pick up need
// to be according to the facility — and an option to select a custom time").
//
// The times on offer come from the facility, for THAT day:
//
//   1. a drop-off/pick-up window set for that date and this service
//      (Settings › drop-off & pick-up overrides), else
//   2. the service's standing hours (`service_time_windows`: boarding's
//      per weekday, daycare's full day, morning or afternoon), else
//   3. the facility's hours that day (a one-day override, else the week),
//      with drop-off ending an hour before closing and pick-up starting an
//      hour after opening.
//
// Daycare's half day is a morning or an afternoon of the half-day service's
// length, at either end of the day. Every time is a chip at `step` minutes,
// and "Custom time" takes any other: inside opening hours for a customer,
// anything for staff — who are told when it falls outside the window.
// ============================================================================

export interface TimeWindow {
  /** Minutes from midnight. */
  start: number;
  end: number;
}

export interface DayWindows {
  dropOff: TimeWindow;
  pickUp: TimeWindow;
  /** The facility's opening hours that day: a custom time's bounds. */
  open: TimeWindow;
}

export interface DropOffPickUpOverride {
  date: string;
  services: string[];
  dropOffStart: string;
  dropOffEnd: string;
  pickUpStart: string;
  pickUpEnd: string;
}

export type DayPart = "full" | "am" | "pm";

const HOUR = 60;

export function minutesOf(value: string | null | undefined): number | null {
  const m = /^\s*(\d{1,2}):(\d{2})/.exec(value ?? "");
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return Number(m[1]) > 23 || Number(m[2]) > 59 ? null : minutes;
}

export function hhmmOf(minutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(minutes)));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function window(start: number | null, end: number | null): TimeWindow | null {
  return start !== null && end !== null && end >= start ? { start, end } : null;
}

/** The facility's opening hours on `date`, or null when it is closed. */
function openWindow(
  date: Date,
  hours: WeeklyHours | null | undefined,
  overrides?: readonly DayOverride[],
): TimeWindow | null {
  const day = facilityHoursForDate(date, hours, overrides);
  if (!day?.isOpen) return null;
  return window(minutesOf(day.openTime), minutesOf(day.closeTime));
}

/**
 * The windows for one day of one service, or null when it cannot be used
 * (the facility is closed). `halfHours` is the half-day service's length.
 */
export function dayWindows(input: {
  date: Date;
  service: string;
  part?: DayPart;
  halfHours?: number | null;
  hours: WeeklyHours | null | undefined;
  overrides?: readonly DayOverride[];
  dropOffPickUp?: readonly DropOffPickUpOverride[];
  /** The service's standing hours (Settings › Boarding, Daycare). */
  standing?: ServiceTimeWindows | null;
}): DayWindows | null {
  const open = openWindow(input.date, input.hours, input.overrides);
  if (!open) return null;

  const key = facilityDateKey(input.date);
  const set = input.dropOffPickUp?.find(
    (o) => o.date === key && o.services.includes(input.service),
  );
  if (set) {
    const dropOff = window(
      minutesOf(set.dropOffStart),
      minutesOf(set.dropOffEnd),
    );
    const pickUp = window(minutesOf(set.pickUpStart), minutesOf(set.pickUpEnd));
    if (dropOff && pickUp) return { dropOff, pickUp, open };
  }

  const part = input.part ?? "full";
  const standing = standingHours(input.standing, {
    service: input.service,
    weekday: input.date.getDay(),
    part,
  });
  if (standing) {
    const dropOff = window(
      minutesOf(standing.dropOff.start),
      minutesOf(standing.dropOff.end),
    );
    const pickUp = window(
      minutesOf(standing.pickUp.start),
      minutesOf(standing.pickUp.end),
    );
    if (dropOff && pickUp) {
      // The facility's own hours stand as set; a custom time may go as far
      // as they do, even past the front desk's opening hours.
      return {
        dropOff,
        pickUp,
        open: {
          start: Math.min(open.start, dropOff.start, pickUp.start),
          end: Math.max(open.end, dropOff.end, pickUp.end),
        },
      };
    }
  }

  if (part !== "full" && input.halfHours && input.halfHours > 0) {
    const length = Math.round(input.halfHours * HOUR);
    if (part === "am") {
      const end = Math.min(open.start + length, open.end);
      return {
        dropOff: { start: open.start, end: Math.min(open.start + HOUR, end) },
        pickUp: { start: Math.max(end - HOUR, open.start), end },
        open,
      };
    }
    const start = Math.max(open.end - length, open.start);
    return {
      dropOff: { start, end: Math.min(start + HOUR, open.end) },
      pickUp: { start: Math.max(open.end - HOUR, start), end: open.end },
      open,
    };
  }

  // A drop-off at closing time, or a pick-up at opening, leaves no stay.
  const roomy = open.end - open.start >= 2 * HOUR;
  return {
    dropOff: { start: open.start, end: roomy ? open.end - HOUR : open.end },
    pickUp: { start: roomy ? open.start + HOUR : open.start, end: open.end },
    open,
  };
}

/** The common part of several days' windows (the same times every day). */
export function intersect(windows: readonly TimeWindow[]): TimeWindow | null {
  if (windows.length === 0) return null;
  const start = Math.max(...windows.map((w) => w.start));
  const end = Math.min(...windows.map((w) => w.end));
  return end >= start ? { start, end } : null;
}

/**
 * How far apart the chips are: half-hours in a window of six hours or less,
 * hours in a longer one — a whole business day at half-hours is twenty-odd
 * chips, and "Custom time" takes any minute in between.
 */
export function chipStep(w: TimeWindow): number {
  return w.end - w.start > 6 * HOUR ? HOUR : 30;
}

/** Every chip in a window, `step` minutes apart, both ends included. */
export function chipTimes(w: TimeWindow, step = 30): number[] {
  const first = Math.ceil(w.start / step) * step;
  const times: number[] = [];
  for (let t = first; t <= w.end; t += step) times.push(t);
  return times;
}

/** The time a stay starts with: the first chip. */
export function defaultDropOff(w: TimeWindow, step = 30): number {
  return chipTimes(w, step)[0] ?? w.start;
}

/** The time a stay ends with: 5:00 PM where offered, else the last chip. */
export function defaultPickUp(w: TimeWindow, step = 30): number {
  const chips = chipTimes(w, step);
  return chips.includes(17 * HOUR) ? 17 * HOUR : (chips.at(-1) ?? w.end);
}

/**
 * Whether a custom time may be booked, and whether staff should be told it
 * is outside the window. A customer stays inside opening hours.
 */
export function checkCustomTime(
  minutes: number | null,
  windows: { window: TimeWindow; open: TimeWindow },
  asCustomer: boolean,
): { ok: boolean; outside: boolean } {
  if (minutes === null) return { ok: false, outside: false };
  const inOpen = minutes >= windows.open.start && minutes <= windows.open.end;
  const inWindow =
    minutes >= windows.window.start && minutes <= windows.window.end;
  if (asCustomer) return { ok: inOpen, outside: !inWindow };
  return { ok: true, outside: !inWindow };
}

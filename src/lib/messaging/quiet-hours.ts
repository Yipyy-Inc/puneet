// Deliberately NOT `server-only`. Everything here is date arithmetic over
// values the caller supplies -- no secrets, no database, no environment -- and
// marking it server-only would put it out of reach of `bun test`, which is the
// only tier that can practically exercise a DST boundary or a window that
// crosses midnight.

import {
  DEFAULT_TIMEZONE,
  instantFromWallClock,
  wallClockParts,
} from "@/lib/time/facility-time";
import {
  isQuietAt,
  minutesOfDay,
  type QuietHours,
} from "@/lib/settings/messaging-policy";

// ============================================================================
// When a non-transactional message is allowed to go out.
//
// ── THE ONE GUARDRAIL THAT DEFERS ─────────────────────────────────────────
//
// Every other check in the ladder decides whether to send. This one decides
// WHEN. A visit closing at 20:40 with a one-hour delay is due at 21:40, inside
// quiet hours, and the message must arrive at 09:00 the next morning — not be
// skipped. A dropped message and a message nobody sent look identical from the
// facility's side, and they would never learn which happened.
//
// So `nextSendableInstant` returns a TIME, never a refusal. The caller moves
// `scheduled_for` and leaves the row `queued`.
//
// ── THE ZONE IS THE LOCATION'S, NOT THE SERVER'S ──────────────────────────
//
// `public.locations.timezone` first, then `public.facilities.timezone`, then
// the default. The audit that prompted this found an SMS logged at 04:00 and
// explained it as a rendering bug — timestamps were being shown in UTC. Both
// halves were true: the display was UTC, AND nothing was checking the hour.
//
// ── IT IS NOT A CONSENT MECHANISM ─────────────────────────────────────────
//
// Consent is `message_suppressions`, keyed by address, checked separately and
// failing closed. Nothing here relaxes it: a suppressed address is refused at
// 11 a.m. exactly as it is at midnight. Quiet hours only move a message that
// was already allowed to be sent.
// ============================================================================

/** Resolve the zone a message should be timed against. */
export function sendingZone(
  locationTimezone?: string | null,
  facilityTimezone?: string | null,
): string {
  return (
    locationTimezone?.trim() || facilityTimezone?.trim() || DEFAULT_TIMEZONE
  );
}

/**
 * The first moment at or after `scheduledFor` that is outside quiet hours.
 *
 * Returns `scheduledFor` unchanged when quiet hours are off or the moment is
 * already allowed — the common case, and it costs one `Intl` format.
 *
 * A window that crosses midnight ("22:00 to 08:00" expressed as an allowed
 * period of 08:00-22:00, or a genuinely inverted one) is handled by
 * `isQuietAt`; this only has to find the next boundary and step to it.
 */
export function nextSendableInstant(
  scheduledFor: Date,
  zone: string,
  quiet: QuietHours,
): Date {
  if (!quiet.enabled) return scheduledFor;

  const { date, time } = wallClockParts(scheduledFor.toISOString(), zone);
  if (!isQuietAt(quiet, minutesOfDay(time))) return scheduledFor;

  // Quiet, so the next allowed moment is the start of the window. If that is
  // earlier today than the message is due, it means the message is due in the
  // evening tail of the quiet period and the window opens tomorrow.
  const opensToday = minutesOfDay(quiet.start) > minutesOfDay(time);
  const day = opensToday ? date : addDays(date, 1);

  return new Date(instantFromWallClock(day, quiet.start, zone));
}

/**
 * How late a queued message is allowed to be before it is abandoned.
 *
 * The direct fix for a nudge that arrived 49 days after its request, and it is
 * general rather than reputation-specific on purpose: a worker outage backs up
 * every workflow step and every automation. When the queue drains, a message
 * whose moment has passed must be dropped and recorded, not sent — "your
 * appointment is tomorrow", three days late, is worse than silence.
 */
export function isTooLate(
  scheduledFor: Date,
  now: Date,
  maxLatenessHours: number,
): boolean {
  return now.getTime() - scheduledFor.getTime() > maxLatenessHours * 3_600_000;
}

/**
 * A deterministic offset inside a window, derived from an id.
 *
 * Pacing exists because a sudden spike in review velocity is what makes a
 * platform's spam filter discard a whole batch — the reviews are collected, and
 * then they are not there. Spreading the sends needs jitter, and the jitter has
 * to be STABLE: a retry of the same row must land in the same slot, or a
 * message could be deferred repeatedly and never sent at all.
 */
export function jitterMinutes(id: string, spreadMinutes: number): number {
  if (spreadMinutes <= 0) return 0;
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % spreadMinutes;
}

/** "YYYY-MM-DD" plus n days, without going through a Date's local zone. */
function addDays(date: string, days: number): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

/** The facility-local calendar date an instant falls on. */
export function businessDay(instant: Date, zone: string): string {
  return wallClockParts(instant.toISOString(), zone).date;
}

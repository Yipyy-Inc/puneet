// ============================================================================
// WHICH CALENDAR DAYS A "MINIMUM ADVANCE BOOKING" RULE ACTUALLY ALLOWS.
//
// ── THE BUG THIS WAS EXTRACTED FROM ───────────────────────────────────────
//
// `booking_rules.minimumAdvanceBooking` is in HOURS, so the earliest bookable
// moment is an INSTANT — `now + 24h` is tomorrow at whatever o'clock it
// happens to be. Every cell in a date grid is `new Date(y, m, d)`, which is
// MIDNIGHT. Comparing the two directly asks "does this day BEGIN after the
// deadline", and for the day the deadline falls on the answer is always no.
//
// So a 24-hour rule cost TWO days rather than one. On 2026-09-21 the facility's
// own New Booking modal offered nothing before the 23rd, and the client
// reported it as "it doesn't allow me to book the same day, it always shows
// 2-3 days after". A 48-hour rule would have cost three days.
//
// The question a DAY picker asks is not "does this day begin after the
// deadline" but "is there any bookable moment in it" — which is the day's END.
//
// Same family as the vaccination-expiry bug fixed the same day: a calendar day
// measured against an instant. It is the most common date mistake in this
// codebase and it always reads as an off-by-one.
// ============================================================================

/** The earliest moment a booking may start, given a rule in HOURS. */
export function earliestBookableInstant(
  now: Date,
  minimumAdvanceHours: number,
): Date {
  return new Date(now.getTime() + minimumAdvanceHours * 60 * 60 * 1000);
}

/** The last instant of a calendar day, in the viewer's own zone. */
export function endOfDay(day: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    23,
    59,
    59,
    999,
  );
}

/**
 * Is any part of this calendar day still bookable?
 *
 * `minimum` absent means unconstrained. Compared against the day's END so a
 * rule in hours costs the days it actually describes — a 24-hour rule taken at
 * 08:00 rules out today and nothing else.
 */
export function dayClearsMinimum(
  day: Date,
  minimum: Date | undefined,
): boolean {
  if (!minimum) return true;
  return endOfDay(day) >= minimum;
}

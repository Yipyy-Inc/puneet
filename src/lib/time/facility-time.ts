// ============================================================================
// Facility wall-clock time <-> stored instants.
//
// A booking is "2pm at the kennel". It does not become 3pm because the person
// looking at the roster is in another country, and it must not shift because a
// build ran in a different region. So every conversion in both directions goes
// through the FACILITY's zone — never the server's, never the viewer's.
//
// This was not a hypothetical: a booking seeded at 14:00 came back as 15:00,
// because the write sent a naive timestamp (read as UTC) and the read rendered
// it in the local zone. Invisible in development, wrong for every appointment
// in production. One module so the two directions cannot disagree again.
// ============================================================================

/** How far `timeZone` is from UTC at a given instant, in minutes. */
function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );

  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    // Intl renders midnight as "24" in some engines under hour12:false.
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return (asIfUtc - instant.getTime()) / 60000;
}

/**
 * "YYYY-MM-DD" + "HH:MM" in `timeZone` -> the ISO instant it names.
 *
 * Two passes: the first offset is measured at the wrong instant, and the
 * second corrects it when the guess landed on the far side of a DST change.
 */
export function instantFromWallClock(
  date: string,
  time: string,
  timeZone: string,
): string {
  const wallClock = new Date(`${date}T${time}:00Z`);
  const first = offsetMinutes(wallClock, timeZone);
  let instant = new Date(wallClock.getTime() - first * 60000);

  const second = offsetMinutes(instant, timeZone);
  if (second !== first) {
    instant = new Date(wallClock.getTime() - second * 60000);
  }
  return instant.toISOString();
}

/** A stored instant -> the date and time it reads as on the facility's clock. */
export function wallClockParts(
  timestamp: string,
  timeZone: string,
): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(timestamp))
      .map((p) => [p.type, p.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`,
  };
}

/** The demo facility's zone, used only when a row carries none. */
export const DEFAULT_TIMEZONE = "America/Toronto";

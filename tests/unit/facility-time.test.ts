import { describe, expect, test } from "bun:test";

import {
  DEFAULT_TIMEZONE,
  instantFromWallClock,
  wallClockParts,
} from "@/lib/time/facility-time";

// ============================================================================
// A BOOKING AT 2PM STAYS AT 2PM.
//
// `facility-time.ts` carries the note about why it exists: a booking seeded at
// 14:00 came back as 15:00, because the write sent a naive timestamp and the
// read rendered it in the server's zone. Invisible in development, wrong for
// every appointment in production.
//
// Nothing tested it. That was tolerable while the module was a pair of pure
// functions over `Intl`; it stopped being tolerable on 2026-09-24, when both
// functions were given a FORMATTER CACHE to stop `/api/bookings` timing out.
// A cache that returns the wrong zone's formatter would move every booking on
// the screen by an hour and no other test in this repo would notice.
//
// So these assert two separate things:
//   · the conversions are still correct, in both directions, across DST;
//   · the cache is keyed properly — zones do not contaminate each other, and a
//     cached formatter agrees with a freshly built one.
// ============================================================================

const TORONTO = "America/Toronto";
const VANCOUVER = "America/Vancouver";
const UTC = "UTC";

describe("wall clock to instant and back", () => {
  test("a winter afternoon in Toronto is EST, five hours behind UTC", () => {
    // 2026-01-15 is solidly outside DST.
    expect(instantFromWallClock("2026-01-15", "14:00", TORONTO)).toBe(
      "2026-01-15T19:00:00.000Z",
    );
  });

  test("a summer afternoon is EDT, four hours behind", () => {
    expect(instantFromWallClock("2026-07-15", "14:00", TORONTO)).toBe(
      "2026-07-15T18:00:00.000Z",
    );
  });

  test("the round trip returns what went in", () => {
    for (const [date, time] of [
      ["2026-01-15", "14:00"],
      ["2026-07-15", "09:30"],
      ["2026-12-31", "23:45"],
      ["2026-06-01", "00:00"],
    ] as const) {
      const instant = instantFromWallClock(date, time, TORONTO);
      expect(wallClockParts(instant, TORONTO)).toEqual({ date, time });
    }
  });

  test("midnight reads as 00:00, not 24:00", () => {
    // `hour12: false` renders midnight as "24" in some engines, which the
    // module corrects. A booking at 24:00 on the 1st is one nobody can find.
    const instant = instantFromWallClock("2026-03-20", "00:00", TORONTO);
    expect(wallClockParts(instant, TORONTO)).toEqual({
      date: "2026-03-20",
      time: "00:00",
    });
  });
});

describe("daylight saving", () => {
  // Toronto springs forward 2026-03-08 and falls back 2026-11-01.
  test("the day before and the day after the spring change differ by an hour of UTC", () => {
    const before = instantFromWallClock("2026-03-07", "12:00", TORONTO);
    const after = instantFromWallClock("2026-03-09", "12:00", TORONTO);
    expect(before).toBe("2026-03-07T17:00:00.000Z"); // EST, -5
    expect(after).toBe("2026-03-09T16:00:00.000Z"); // EDT, -4
  });

  test("and around the autumn change", () => {
    expect(instantFromWallClock("2026-10-31", "12:00", TORONTO)).toBe(
      "2026-10-31T16:00:00.000Z",
    );
    expect(instantFromWallClock("2026-11-02", "12:00", TORONTO)).toBe(
      "2026-11-02T17:00:00.000Z",
    );
  });

  test("both sides of a change still round-trip", () => {
    for (const date of [
      "2026-03-07",
      "2026-03-09",
      "2026-10-31",
      "2026-11-02",
    ]) {
      const instant = instantFromWallClock(date, "12:00", TORONTO);
      expect(wallClockParts(instant, TORONTO)).toEqual({ date, time: "12:00" });
    }
  });
});

describe("the formatter cache is keyed on the zone", () => {
  // THE ASSERTION THE CACHE EXISTS FOR. Both functions memoise their
  // `Intl.DateTimeFormat` by time zone. Key it wrongly — or share one instance
  // across zones — and every booking in the second facility moves.
  test("three zones give three different answers for one wall-clock time", () => {
    const toronto = instantFromWallClock("2026-07-15", "12:00", TORONTO);
    const vancouver = instantFromWallClock("2026-07-15", "12:00", VANCOUVER);
    const utc = instantFromWallClock("2026-07-15", "12:00", UTC);

    expect(toronto).toBe("2026-07-15T16:00:00.000Z"); // EDT, -4
    expect(vancouver).toBe("2026-07-15T19:00:00.000Z"); // PDT, -7
    expect(utc).toBe("2026-07-15T12:00:00.000Z");
  });

  test("interleaving zones does not contaminate either one", () => {
    // Alternating forces the cache to be consulted repeatedly rather than
    // filled once, which is how a wrong key shows itself.
    for (let i = 0; i < 5; i++) {
      expect(instantFromWallClock("2026-07-15", "12:00", TORONTO)).toBe(
        "2026-07-15T16:00:00.000Z",
      );
      expect(instantFromWallClock("2026-07-15", "12:00", VANCOUVER)).toBe(
        "2026-07-15T19:00:00.000Z",
      );
      expect(wallClockParts("2026-07-15T16:00:00.000Z", TORONTO).time).toBe(
        "12:00",
      );
      expect(wallClockParts("2026-07-15T16:00:00.000Z", VANCOUVER).time).toBe(
        "09:00",
      );
    }
  });

  test("a cached answer matches one computed with a formatter built fresh", () => {
    // The cache must be a pure speed-up. This builds the equivalent formatter
    // by hand and demands the same parts back — if the cached options ever
    // drift from the literal ones, this is what says so.
    const stamp = "2026-07-15T16:00:00.000Z";
    const fresh = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: TORONTO,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .formatToParts(new Date(stamp))
        .map((p) => [p.type, p.value]),
    );

    expect(wallClockParts(stamp, TORONTO)).toEqual({
      date: `${fresh.year}-${fresh.month}-${fresh.day}`,
      time: `${fresh.hour === "24" ? "00" : fresh.hour}:${fresh.minute}`,
    });
  });

  test("the default zone is the one the demo facility uses", () => {
    expect(DEFAULT_TIMEZONE).toBe(TORONTO);
    expect(instantFromWallClock("2026-07-15", "12:00", DEFAULT_TIMEZONE)).toBe(
      instantFromWallClock("2026-07-15", "12:00", TORONTO),
    );
  });
});

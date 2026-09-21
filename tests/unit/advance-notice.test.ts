import { describe, expect, test } from "bun:test";

import {
  dayClearsMinimum,
  earliestBookableInstant,
  endOfDay,
} from "@/lib/bookings/advance-notice";

// ============================================================================
// The client's report, made into arithmetic.
//
// "When I'm trying to book any service, it doesn't allow me to book the same
// day, it always shows 2-3 days after" — 2026-09-21, from the facility's own
// New Booking modal, with no `booking_rules` row stored, so the shipped
// default of 24 HOURS applied.
//
// The first test is that exact situation. A rule that does not reproduce the
// report is not the rule that caused it.
// ============================================================================

/** A local-time date, so these read as a person would say them. */
const at = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min);

const day = (y: number, m: number, d: number) => at(y, m, d);

describe("what a minimum-advance rule costs", () => {
  test("a 24-hour rule at 14:00 rules out today and tomorrow — the bug", () => {
    const now = at(2026, 9, 21, 14, 0);
    const min = earliestBookableInstant(now, 24); // 2026-09-22 14:00

    // The OLD comparison was `midnight(day) < min`, which also ruled out the
    // 22nd — the day the deadline falls inside. That is the "2-3 days after".
    expect(day(2026, 9, 22) < min).toBe(true); // what it used to do
    expect(dayClearsMinimum(day(2026, 9, 22), min)).toBe(true); // what it does now

    expect(dayClearsMinimum(day(2026, 9, 21), min)).toBe(false);
    expect(dayClearsMinimum(day(2026, 9, 23), min)).toBe(true);
  });

  test("a 24-hour rule costs exactly one day, whatever the hour", () => {
    for (const hour of [0, 8, 14, 23]) {
      const min = earliestBookableInstant(at(2026, 9, 21, hour), 24);
      expect(
        dayClearsMinimum(day(2026, 9, 21), min),
        `today should be out at ${hour}:00`,
      ).toBe(false);
      expect(
        dayClearsMinimum(day(2026, 9, 22), min),
        `tomorrow should be in at ${hour}:00`,
      ).toBe(true);
    }
  });

  test("a 12-hour rule still allows today, if the day has 12 hours left", () => {
    const early = earliestBookableInstant(at(2026, 9, 21, 8, 0), 12);
    expect(dayClearsMinimum(day(2026, 9, 21), early)).toBe(true);

    // And stops allowing it once it cannot be met.
    const late = earliestBookableInstant(at(2026, 9, 21, 20, 0), 12);
    expect(dayClearsMinimum(day(2026, 9, 21), late)).toBe(false);
    expect(dayClearsMinimum(day(2026, 9, 22), late)).toBe(true);
  });

  test("no rule at all allows same-day booking", () => {
    // Which is the SETTING a facility changes to accept same-day work — not
    // something this code decides for them.
    const min = earliestBookableInstant(at(2026, 9, 21, 23, 30), 0);
    expect(dayClearsMinimum(day(2026, 9, 21), min)).toBe(true);
    expect(dayClearsMinimum(day(2026, 9, 21), undefined)).toBe(true);
  });

  test("a 48-hour rule costs two days, not three", () => {
    const min = earliestBookableInstant(at(2026, 9, 21, 14, 0), 48);
    expect(dayClearsMinimum(day(2026, 9, 22), min)).toBe(false);
    expect(dayClearsMinimum(day(2026, 9, 23), min)).toBe(true);
  });

  test("it crosses a month boundary without losing a day", () => {
    const min = earliestBookableInstant(at(2026, 9, 30, 14, 0), 24);
    expect(dayClearsMinimum(day(2026, 10, 1), min)).toBe(true);
    expect(dayClearsMinimum(day(2026, 9, 30), min)).toBe(false);
  });

  test("the end of a day is that day, not the next", () => {
    const e = endOfDay(day(2026, 9, 21));
    expect(e.getDate()).toBe(21);
    expect(e.getHours()).toBe(23);
    // One millisecond short of midnight: a day that ended at 00:00 tomorrow
    // would make every "tomorrow" comparison true by a hair.
    expect(e.getTime()).toBe(day(2026, 9, 22).getTime() - 1);
  });
});

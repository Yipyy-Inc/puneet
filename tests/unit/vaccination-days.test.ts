import { describe, expect, test } from "bun:test";

import { addDaysIso, daysUntilIso, expiryState } from "@/lib/vaccinations";

// ============================================================================
// A vaccination expiry is a CALENDAR DAY, and the customer portal counted it
// against an instant.
//
// Three screens ran some variant of:
//
//   const days = Math.floor(
//     (new Date(v.expiryDate).getTime() - Date.now()) / 86_400_000);
//
// `new Date("2026-09-11")` is midnight UTC, which in Montréal is 20:00 on the
// 10th. So from 00:00 to 20:00 local on the day a certificate expires, that
// subtraction is negative and the screen says "expired 1 day ago" about a
// certificate that is still good — every day, for most of the day, for every
// user west of UTC. `daysUntilIso` parses both sides as UTC midnight, so the
// difference is exact calendar days and no clock is involved.
// ============================================================================

describe("counting calendar days", () => {
  test("today is zero, not a fraction of a day", () => {
    expect(daysUntilIso("2026-09-21", "2026-09-21")).toBe(0);
  });

  test("tomorrow is one and yesterday is minus one", () => {
    expect(daysUntilIso("2026-09-22", "2026-09-21")).toBe(1);
    expect(daysUntilIso("2026-09-20", "2026-09-21")).toBe(-1);
  });

  test("it counts across a month and a year boundary", () => {
    expect(daysUntilIso("2026-10-01", "2026-09-21")).toBe(10);
    expect(daysUntilIso("2027-01-01", "2026-12-31")).toBe(1);
  });

  test("a leap day is a day", () => {
    // 2028 is a leap year; Feb 28 → Mar 1 is TWO days, not one.
    expect(daysUntilIso("2028-03-01", "2028-02-28")).toBe(2);
    expect(daysUntilIso("2027-03-01", "2027-02-28")).toBe(1);
  });

  test("a DST changeover does not lose or gain a day", () => {
    // Montréal springs forward 2026-03-08. A naive millisecond division over
    // this window yields 0.958 of a day and floors to 0.
    expect(daysUntilIso("2026-03-09", "2026-03-08")).toBe(1);
    // And falls back 2026-11-01, where the same division yields 1.04.
    expect(daysUntilIso("2026-11-02", "2026-11-01")).toBe(1);
  });

  test("a timestamp is read as its date, not rounded by its time", () => {
    expect(daysUntilIso("2026-09-22T23:59:00Z", "2026-09-21")).toBe(1);
  });

  test("it agrees with expiryState at the boundary", () => {
    // The bug in one line: on its expiry day a certificate is NOT expired.
    expect(daysUntilIso("2026-09-21", "2026-09-21")).toBe(0);
    expect(expiryState("2026-09-21", "2026-09-21")).toBe("expiring");
    expect(expiryState("2026-09-20", "2026-09-21")).toBe("expired");
  });

  test("it is the inverse of addDaysIso", () => {
    for (const n of [0, 1, 29, 30, 365, -1, -400]) {
      expect(daysUntilIso(addDaysIso("2026-09-21", n), "2026-09-21")).toBe(n);
    }
  });
});

import { describe, expect, test } from "bun:test";

import {
  localDay,
  nextLocalDay,
  totalsWindow,
} from "@/app/facility/dashboard/gift-cards/_lib/totals-range";

// ============================================================================
// The picked range, turned into the window the totals route reads.
//
// Worth isolating because both failures are invisible on screen. An end day
// handed over as-is drops a whole day of sales from the last day of every
// period; a day read through toISOString() shifts by one for half the world,
// and Montreal is on the half that shifts.
// ============================================================================

describe("localDay", () => {
  test("reads the LOCAL calendar, not the UTC one", () => {
    // 23:30 local on the 16th. In any zone west of Greenwich this instant is
    // already the 17th in UTC, so toISOString().slice(0, 10) would say so.
    const late = new Date(2026, 8, 16, 23, 30, 0);
    expect(localDay(late)).toBe("2026-09-16");
  });

  test("pads the month and the day", () => {
    expect(localDay(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  test("an early-morning instant stays on its own day", () => {
    // The other direction: 00:30 local, which east of Greenwich is still the
    // day before in UTC.
    expect(localDay(new Date(2026, 8, 16, 0, 30, 0))).toBe("2026-09-16");
  });
});

describe("nextLocalDay", () => {
  test("rolls over a month", () => {
    expect(nextLocalDay(new Date(2026, 8, 30, 23, 59, 59))).toBe("2026-10-01");
  });

  test("rolls over a year", () => {
    expect(nextLocalDay(new Date(2026, 11, 31, 12, 0, 0))).toBe("2027-01-01");
  });

  test("handles a leap day", () => {
    expect(nextLocalDay(new Date(2028, 1, 29))).toBe("2028-03-01");
  });
});

describe("totalsWindow", () => {
  test("`to` is the day AFTER the last day picked", () => {
    // This is the whole point: the route asks `issued_at < to`, so passing the
    // 30th would drop every card sold on the 30th.
    const range = {
      preset: "month" as const,
      start: new Date(2026, 8, 1, 0, 0, 0, 0),
      end: new Date(2026, 8, 30, 23, 59, 59, 999),
    };
    expect(totalsWindow(range)).toEqual({
      from: "2026-09-01",
      to: "2026-10-01",
    });
  });

  test("a single day is a one-day window, not an empty one", () => {
    const today = new Date(2026, 8, 16, 0, 0, 0, 0);
    const range = {
      preset: "today" as const,
      start: today,
      end: new Date(2026, 8, 16, 23, 59, 59, 999),
    };
    const { from, to } = totalsWindow(range);
    expect(from).toBe("2026-09-16");
    // from === to would ask for nothing at all.
    expect(to).toBe("2026-09-17");
    expect(from).not.toBe(to);
  });
});

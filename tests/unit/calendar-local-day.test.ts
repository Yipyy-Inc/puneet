import { afterAll, describe, expect, test } from "bun:test";

import {
  formatISODate,
  getMonthDays,
  getWeekDays,
} from "@/components/facility/training/training-calendar-utils";

// The training calendar keys every cell, dot and "today" by this string. It
// was `toISOString()` — the UTC day — so in Montréal after 20:00 today was
// tomorrow, and east of UTC a session's dot sat on the day before it.
//
// `bun test` runs in UTC, where the two agree — which is how the bug hid.
// Each case sets the zone itself.

const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  process.env.TZ = ORIGINAL_TZ;
});

for (const zone of ["America/Toronto", "Europe/London", "Pacific/Auckland"]) {
  describe(`the calendar's day is the local day (${zone})`, () => {
    test("a local midnight, or a late evening, is its own date", () => {
      process.env.TZ = zone;
      expect(formatISODate(new Date(2026, 8, 15))).toBe("2026-09-15");
      expect(formatISODate(new Date(2026, 8, 15, 23, 30))).toBe("2026-09-15");
    });

    test("the week and the month grid round-trip their own dates", () => {
      process.env.TZ = zone;
      const week = getWeekDays("2026-09-15").map(formatISODate);
      expect(week[0]).toBe("2026-09-14");
      expect(week).toContain("2026-09-15");
      const month = getMonthDays("2026-09-15")
        .filter((d): d is Date => d !== null)
        .map(formatISODate);
      expect(month[0]).toBe("2026-09-01");
      expect(month.at(-1)).toBe("2026-09-30");
    });
  });
}

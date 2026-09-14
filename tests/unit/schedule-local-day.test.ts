import { afterAll, describe, expect, test } from "bun:test";

import {
  formatDateStr,
  getDatesForView,
} from "@/components/scheduling/ScheduleCalendarHelpers";

// The scheduling grid keys every cell by this string, and the header prints
// `date.getDate()`. It was `toISOString()` — the UTC day — so in Toronto after
// 20:00 every shift was drawn a column early and an empty cell offered the
// next day's date.
//
// `bun test` runs in UTC, where the two agree — which is how it hid. Each case
// sets the zone itself.

const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  process.env.TZ = ORIGINAL_TZ;
});

for (const zone of ["America/Toronto", "Europe/London", "Pacific/Auckland"]) {
  describe(`the scheduling grid's day is the local day (${zone})`, () => {
    test("a late evening is still its own date", () => {
      process.env.TZ = zone;
      expect(formatDateStr(new Date(2026, 8, 13, 21, 30))).toBe("2026-09-13");
      expect(formatDateStr(new Date(2026, 8, 13, 0, 5))).toBe("2026-09-13");
    });

    test("a week opened on a Sunday evening runs Monday to that Sunday", () => {
      process.env.TZ = zone;
      const week = getDatesForView(new Date(2026, 8, 13, 21, 30), "week").map(
        formatDateStr,
      );
      expect(week[0]).toBe("2026-09-07");
      expect(week.at(-1)).toBe("2026-09-13");
      week.forEach((day, i) => expect(Number(day.slice(8))).toBe(7 + i));
    });
  });
}

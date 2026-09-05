import { describe, expect, test } from "bun:test";

import {
  WEEKDAY_KEYS,
  weekdayFormatter,
  weekdayName,
} from "../../src/lib/settings/weekday";

// ============================================================================
// The business-hours editor renamed every day of the week for French users for
// as long as it existed: it printed its own English object keys under CSS
// `capitalize`. The fix routes them through Intl, and the way THAT fix fails is
// an off-by-one in the reference week — which does not throw, does not fail a
// type check, and renders a full, plausible week that is simply wrong.
//
// So the mapping is asserted here, in both languages, rather than trusted.
// ============================================================================

describe("weekday names", () => {
  test("the reference week maps each key to its own day", () => {
    const en = weekdayFormatter("en");
    expect(WEEKDAY_KEYS.map((day) => weekdayName(en, day))).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]);
  });

  test("French gets French, in French's own casing", () => {
    const fr = weekdayFormatter("fr");
    expect(WEEKDAY_KEYS.map((day) => weekdayName(fr, day))).toEqual([
      "lundi",
      "mardi",
      "mercredi",
      "jeudi",
      "vendredi",
      "samedi",
      "dimanche",
    ]);
  });

  test("the week starts on Monday and ends on Sunday", () => {
    // The editor lists the week in this order. A schedule that opens on Sunday
    // is a different product.
    expect(WEEKDAY_KEYS[0]).toBe("monday");
    expect(WEEKDAY_KEYS.at(-1)).toBe("sunday");
    expect(WEEKDAY_KEYS).toHaveLength(7);
  });

  test("a key is matched whatever its casing", () => {
    const en = weekdayFormatter("en");
    expect(weekdayName(en, "WEDNESDAY")).toBe("Wednesday");
    expect(weekdayName(en, "Wednesday")).toBe("Wednesday");
  });

  test("an unknown key renders itself rather than nothing", () => {
    // A settings blob holding something unexpected should show what it holds:
    // a visible oddity beats a blank cell nobody notices.
    const en = weekdayFormatter("en");
    expect(weekdayName(en, "caturday")).toBe("caturday");
    expect(weekdayName(en, "")).toBe("");
  });
});

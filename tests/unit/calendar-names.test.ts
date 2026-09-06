import { describe, expect, test } from "bun:test";

import { monthNames, weekdayNames } from "../../src/lib/dates/calendar-names";

// The order is the whole risk. A calendar that labels the right grid with the
// wrong names renders perfectly and books the wrong day — the same shape the
// weekday.ts tests exist for, and invisible to both tsc and a browser test.

describe("weekday names", () => {
  test("index 0 is Sunday, so getDay() addresses them directly", () => {
    expect(weekdayNames("en", "long")[0]).toBe("Sunday");
    expect(weekdayNames("en", "long")[6]).toBe("Saturday");
  });

  test("the whole week is in order", () => {
    expect(weekdayNames("en", "long")).toEqual([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]);
  });

  test("French is French, and in the same order", () => {
    const fr = weekdayNames("fr", "long");
    expect(fr[0]).toBe("dimanche");
    expect(fr[1]).toBe("lundi");
    expect(fr[6]).toBe("samedi");
  });

  test("every form returns seven distinct-enough names", () => {
    for (const form of ["narrow", "short", "long"] as const) {
      expect(weekdayNames("en", form)).toHaveLength(7);
      expect(weekdayNames("fr", form)).toHaveLength(7);
    }
    // The narrow form is the one the grid header uses.
    expect(weekdayNames("en", "narrow")[1]).toBe("M");
  });

  test("it does not slip a day on a zone boundary", () => {
    // The dates are UTC and the formatter is told so. Were either missing,
    // a negative-offset zone would shift every name back by one.
    expect(weekdayNames("en", "long")[0]).not.toBe("Saturday");
  });
});

describe("month names", () => {
  test("index 0 is January, so getMonth() addresses them directly", () => {
    expect(monthNames("en")[0]).toBe("January");
    expect(monthNames("en")[11]).toBe("December");
  });

  test("twelve of them, in both languages", () => {
    expect(monthNames("en")).toHaveLength(12);
    expect(monthNames("fr")).toHaveLength(12);
  });

  test("French is French", () => {
    expect(monthNames("fr")[0]).toBe("janvier");
    expect(monthNames("fr")[8]).toBe("septembre");
  });
});

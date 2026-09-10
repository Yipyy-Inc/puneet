import { describe, expect, test } from "bun:test";

import {
  formatDateISO,
  formatDateLong,
  formatDateShort,
  formatDuration,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPhone,
  formatRelative,
  formatRelativeShort,
  formatWeekday,
  formatTime,
  formatTimeOfDay,
  formatList,
  formatWeight,
  formatWeightFromLb,
} from "@/lib/i18n/format";

// ============================================================================
// §5q's formatting table, asserted line by line.
//
// This belongs in the unit tier for exactly the reason AGENTS.md gives for
// having one: it is pure logic, worth being sure of, and cheap to isolate.
// It is also the tier that can actually catch this class of bug — a French
// string that is subtly wrong renders perfectly, looks fine to an English
// reader, and no e2e assertion anybody writes in English would notice.
//
// NON-BREAKING SPACES ARE ASSERTED AS   ON PURPOSE. §5q: "it must be
//  . A plain space lets 42,50 $ wrap so the dollar sign lands alone on
// the next line." A test written with a normal space would pass while the
// bug shipped, which makes the escape the entire point of these assertions.
// ============================================================================

const NBSP = " ";
const AT_1430 = new Date(2026, 8, 1, 14, 30, 0); // 2026-09-01, local

describe("§5q — time", () => {
  test("French is 14 h 30, with PLAIN spaces around the h", () => {
    // "Not 14:30, not 14h30. The single most common French-Canadian
    // formatting error in software."
    //
    // And the spaces here are U+0020, NOT U+00A0 — checked against ICU
    // rather than assumed. §5q asks for a non-breaking space "before $ % :",
    // which is money and percent; the clock is not on that list and `Intl`
    // uses plain spaces. Asserting NBSP here would have been a test failing
    // correct code.
    expect(formatTime(AT_1430, "fr")).toBe("14 h 30");
    expect(formatTime(AT_1430, "fr")).not.toContain(NBSP);
  });

  test("English is 2:30 PM, not Intl's own 2:30 p.m.", () => {
    expect(formatTime(AT_1430, "en")).toBe("2:30 PM");
  });

  test("morning English keeps AM", () => {
    expect(formatTime(new Date(2026, 8, 1, 9, 5), "en")).toBe("9:05 AM");
  });
});

describe("§5q — money", () => {
  test("French puts the sign last, behind a NON-BREAKING space", () => {
    expect(formatMoney(42.5, "fr")).toBe(`42,50${NBSP}$`);
  });

  test("English puts it first", () => {
    expect(formatMoney(42.5, "en")).toBe("$42.50");
  });

  test("it is Canadian dollars, not US", () => {
    // The defect this replaced: src/lib/format.ts builds every figure with
    // currency "USD" on en-US. Identical in English, wrong in French.
    expect(formatMoney(42.5, "fr")).not.toContain("US");
  });

  test("whole-dollar drops the cents in both", () => {
    expect(formatMoney(1240, "en", { whole: true })).toBe("$1,240");
    expect(formatMoney(1240, "fr", { whole: true })).toBe(
      `1${NBSP}240${NBSP}$`,
    );
  });

  test("null and undefined are zero, not NaN", () => {
    expect(formatMoney(null, "en")).toBe("$0.00");
    expect(formatMoney(undefined, "en")).toBe("$0.00");
  });
});

describe("§5q — numbers and percent", () => {
  test("French thousands separator is a non-breaking space", () => {
    expect(formatNumber(1240, "fr")).toBe(`1${NBSP}240`);
    expect(formatNumber(1240, "en")).toBe("1,240");
  });

  test("French puts a NBSP before the percent sign", () => {
    expect(formatPercent(82, "fr")).toBe(`82${NBSP}%`);
    expect(formatPercent(82, "en")).toBe("82%");
  });

  test("percent takes the scaled figure, not the fraction", () => {
    expect(formatPercent(82, "en")).toBe("82%");
    expect(formatPercent(8.2, "en", 1)).toBe("8.2%");
  });
});

describe("§5q — dates", () => {
  test("long form matches the spec table in both", () => {
    expect(formatDateLong(AT_1430, "en")).toBe("Tue, Sep 1, 2026");
    expect(formatDateLong(AT_1430, "fr")).toBe("mar. 1 sept. 2026");
  });

  test("no-year form matches the spec table in both", () => {
    expect(formatDateShort(AT_1430, "en")).toBe("Sep 1");
    expect(formatDateShort(AT_1430, "fr")).toBe("1 sept.");
  });

  test("ISO is identical in both, and is the only numeric form allowed", () => {
    // Rule 8: "Never a numeric MM/DD or DD/MM date. Canada reads all three
    // orders and this is a boarding product, where the wrong month is a dog
    // in the wrong week."
    expect(formatDateISO(AT_1430)).toBe("2026-09-01");
  });

  test("no date output anywhere contains a slash", () => {
    for (const locale of ["en", "fr"] as const) {
      expect(formatDateLong(AT_1430, locale)).not.toContain("/");
      expect(formatDateShort(AT_1430, locale)).not.toContain("/");
    }
    expect(formatDateISO(AT_1430)).not.toContain("/");
  });
});

describe("§5q — weight", () => {
  test("metric leads and imperial follows", () => {
    // §5q's own table prints "12.4 kg (28 lb)" and that is ARITHMETICALLY
    // WRONG: 12.4 x 2.20462 = 27.34, which rounds to 27. 28 lb is 12.70 kg.
    // The conversion is correct here and the spec example is off by one —
    // flagged in WORK_ORDER stage 11 rather than fudged to match, because a
    // weight is a medication dose on a screen next to this one.
    expect(formatWeight(12.4, "en")).toBe("12.4 kg (27 lb)");
    expect(formatWeight(12.4, "fr")).toBe("12,4 kg (27 lb)");
  });

  test("one decimal below 20 kg, whole numbers above", () => {
    expect(formatWeight(8.25, "en")).toBe("8.3 kg (18 lb)");
    expect(formatWeight(34.6, "en")).toBe("35 kg (76 lb)");
  });
});

describe("§5q — duration", () => {
  test("French uses the same h shape as the clock", () => {
    expect(formatDuration(90, "fr")).toBe("1 h 30");
    expect(formatDuration(120, "fr")).toBe("1 h".replace("1", "2"));
    expect(formatDuration(45, "fr")).toBe("45 min");
  });

  test("English is compact", () => {
    expect(formatDuration(90, "en")).toBe("1h 30m");
    expect(formatDuration(120, "en")).toBe("2h");
    expect(formatDuration(45, "en")).toBe("45m");
  });
});

describe("§5q — relative time expires at 24 hours", () => {
  const now = new Date(2026, 8, 2, 12, 0, 0);

  test("minutes and hours stay relative", () => {
    expect(formatRelative(new Date(2026, 8, 2, 11, 40), "en", now)).toContain(
      "20",
    );
    expect(formatRelative(new Date(2026, 8, 2, 10, 0), "en", now)).toContain(
      "2",
    );
  });

  test("past 24 hours it becomes a date, not '3 days ago'", () => {
    const threeDaysAgo = new Date(2026, 7, 30, 12, 0, 0);
    expect(formatRelative(threeDaysAgo, "en", now)).toBe("Aug 30");
    expect(formatRelative(threeDaysAgo, "fr", now)).toBe("30 août");
  });

  test("the boundary is 24 hours, not a calendar day", () => {
    const justUnder = new Date(now.getTime() - 23.5 * 3600 * 1000);
    const justOver = new Date(now.getTime() - 24.5 * 3600 * 1000);
    expect(formatRelative(justUnder, "en", now)).not.toBe("Sep 1");
    expect(formatRelative(justOver, "en", now)).toBe("Sep 1");
  });

  test("under half a minute is 'now', not 'this minute'", () => {
    const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);
    expect(formatRelative(tenSecondsAgo, "en", now)).toBe("now");
    expect(formatRelative(tenSecondsAgo, "fr", now)).toBe("maintenant");
    expect(formatRelativeShort(tenSecondsAgo, "fr", now)).toBe("maintenant");
  });

  test("the short form keeps 'il y a' and the same expiry", () => {
    const fiveMin = new Date(now.getTime() - 5 * 60 * 1000);
    const threeDaysAgo = new Date(2026, 7, 30, 12, 0, 0);
    expect(formatRelativeShort(fiveMin, "fr", now)).toBe("il y a 5 min");
    expect(formatRelativeShort(fiveMin, "en", now)).toBe("5 mins ago");
    expect(formatRelativeShort(threeDaysAgo, "fr", now)).toBe("30 août");
  });
});

describe("§5q — phone", () => {
  test("the two locales genuinely differ", () => {
    expect(formatPhone("4165550142", "en")).toBe("(416) 555-0142");
    expect(formatPhone("4165550142", "fr")).toBe("416 555-0142");
  });

  test("anything that is not ten digits comes back untouched", () => {
    // An extension, a short code and an international number are all real.
    // A formatter that "fixes" them destroys information.
    expect(formatPhone("+44 20 7946 0958", "en")).toBe("+44 20 7946 0958");
    expect(formatPhone("311", "en")).toBe("311");
    expect(formatPhone("416-555-0142 x22", "en")).toBe("416-555-0142 x22");
  });
});

// ============================================================================
// A DATE THAT IS NOT A DATE — measured 2026-09-08, on the staff directory.
//
// `Intl.DateTimeFormat.format()` and `Intl.RelativeTimeFormat.format()` do not
// return "Invalid Date" for a non-finite input, they THROW `RangeError`. Inside
// a React render that reaches the nearest error boundary, so the entire staff
// directory rendered as "We couldn't load your board" — five tiles, four tabs
// and every card gone — because one profile had no last-active timestamp.
//
// And one always does: `mappers/staff.ts` maps `row.last_active ?? ""`, so a
// staff member who has never signed in arrives carrying an empty string.
//
// This is the shape AGENTS.md keeps this tier for. Static analysis saw
// well-typed code — `lastActive: string` is satisfied by `""`. An e2e spec
// would have had to seed a blank timestamp into the shared production database
// to assert something three layers below the screen. Here it is four lines.
// ============================================================================

describe("a date that will not parse renders, it does not throw", () => {
  // Every way an absent timestamp actually reaches these functions.
  const junk = ["", "not a date", Number.NaN, new Date("nope")] as const;

  test("every date formatter returns the em dash instead of throwing", () => {
    for (const value of junk) {
      for (const locale of ["en", "fr"] as const) {
        expect(formatDateLong(value, locale)).toBe("—");
        expect(formatDateShort(value, locale)).toBe("—");
        expect(formatTime(value, locale)).toBe("—");
        expect(formatRelative(value, locale)).toBe("—");
      }
      expect(formatDateISO(value)).toBe("—");
    }
  });

  test("a real date is untouched by the guard", () => {
    // The guard must not swallow a falsy-but-real value. Built through the
    // local constructor rather than from epoch 0, which is 1969-12-31 in
    // every negative-offset zone and would fail in Toronto but not in CI.
    const epochLocal = new Date(1970, 0, 1);
    expect(formatDateISO(epochLocal.getTime())).toBe("1970-01-01");
    expect(formatDateISO(new Date(2026, 8, 1))).toBe("2026-09-01");
  });
});

// ============================================================================
// WEEKDAY NAMES, WHICH EIGHT FILES SPELL OUT IN ENGLISH
//
// `["Sun", "Mon", …]` is a format string with extra steps, and §5q's rule is
// flat: always `Intl`. The index→name mapping is worth a test rather than a
// screenshot because the failure is silent and off-by-one — the reference week
// has to be built AND read in UTC, or a negative-offset zone shifts every name
// back a day and Monday renders as Sunday for everyone in Toronto while CI,
// running in UTC, stays green.
// ============================================================================

describe("a weekday index becomes a weekday name", () => {
  test("0 is Sunday and 6 is Saturday, in both languages", () => {
    expect(formatWeekday(0, "en")).toBe("Sun");
    expect(formatWeekday(6, "en")).toBe("Sat");
    // fr-CA abbreviates with a trailing period.
    expect(formatWeekday(0, "fr")).toBe("dim.");
    expect(formatWeekday(6, "fr")).toBe("sam.");
  });

  test("every index maps to a distinct name, so none has shifted", () => {
    for (const locale of ["en", "fr"] as const) {
      const names = [0, 1, 2, 3, 4, 5, 6].map((i) => formatWeekday(i, locale));
      expect(new Set(names).size).toBe(7);
    }
  });

  test("the long form is the whole word", () => {
    expect(formatWeekday(1, "en", "long")).toBe("Monday");
    expect(formatWeekday(1, "fr", "long")).toBe("lundi");
  });

  test("an index off the week is the em dash, not a wrong day", () => {
    for (const bad of [-1, 7, 1.5, Number.NaN]) {
      expect(formatWeekday(bad, "en")).toBe("—");
    }
  });
});

// ============================================================================
// A TIME FIELD IS TWO NUMBERS AND A COLON — NOT A DATE.
//
// `ConfirmStep` built `new Date(\`2000-01-01${t}\`)` and formatted it as
// `en-US`, which is two defects in one line: American formatting for a French
// reader, and an hour that moves with the MACHINE's zone because the
// constructed date is a local midnight. These pin the fix — the zone
// assertion is the one that would have failed before it.
// ============================================================================

describe("a bare HH:MM field becomes a time of day", () => {
  test("the afternoon reads 2:30 PM and 14 h 30", () => {
    expect(formatTimeOfDay("14:30", "en")).toBe("2:30 PM");
    expect(formatTimeOfDay("14:30", "fr")).toBe("14 h 30");
  });

  test("the morning keeps AM, and French drops the meridiem entirely", () => {
    expect(formatTimeOfDay("09:05", "en")).toBe("9:05 AM");
    expect(formatTimeOfDay("09:05", "fr")).toBe("9 h 05");
  });

  test("midnight and noon do not swap", () => {
    expect(formatTimeOfDay("00:00", "en")).toBe("12:00 AM");
    expect(formatTimeOfDay("12:00", "en")).toBe("12:00 PM");
  });

  test("the hour does not move with the machine's time zone", () => {
    // The bug this replaces: a LOCAL date built from "23:30" formats as the
    // 23rd hour of a day the local zone may not agree about. Pinned to UTC on
    // both sides, the digits are the digits whatever TZ is set.
    for (const t of ["00:30", "12:00", "23:30"]) {
      expect(formatTimeOfDay(t, "en")).toContain(
        t === "00:30" ? "12:30" : t === "12:00" ? "12:00" : "11:30",
      );
    }
  });

  test("a half-typed field comes back as typed, not as an em dash", () => {
    // Someone on their way to 9:30 has typed "9:" — blanking it mid-keystroke
    // is worse than showing it back.
    for (const bad of ["", "9:", "abc", "25:00", "10:75"]) {
      expect(formatTimeOfDay(bad, "en")).toBe(bad);
    }
  });
});

describe("a list of names gets the reader's conjunction", () => {
  test("English says and, French says et, and the names are untouched", () => {
    const pets = ["Buddy", "Whiskers", "Daisy", "Max"];
    expect(formatList(pets, "en")).toBe("Buddy, Whiskers, Daisy and Max");
    expect(formatList(pets, "fr")).toBe("Buddy, Whiskers, Daisy et Max");
    expect(formatList(["Kofi"], "fr")).toBe("Kofi");
  });
});

// ============================================================================
// pets.weight IS POUNDS, AND FOUR SCREENS READ IT AS KILOGRAMS FOR A DAY.
//
// The code that charges money converts it with `/ 2.20462` (pricing-rules.ts),
// the grooming tiers compare it to `maxWeightLbs`, and the size bands in
// pet-size.ts are 20 / 40 / 80. A 50 lb dog rendered "50 kg (110 lb)". These
// pin the direction, because both mistakes produce a plausible-looking string.
// ============================================================================

describe("a weight stored in pounds", () => {
  test("a 50 lb dog is about 22.7 kg, and the pounds are kept exactly", () => {
    expect(formatWeightFromLb(50, "en")).toBe("23 kg (50 lb)");
    expect(formatWeightFromLb(25, "en")).toBe("11.3 kg (25 lb)");
  });

  test("French writes the decimal comma, metric still first", () => {
    expect(formatWeightFromLb(25, "fr")).toBe("11,3 kg (25 lb)");
  });

  test("it never reads the pounds as kilograms", () => {
    // The exact wrong output this replaced.
    expect(formatWeightFromLb(50, "en")).not.toBe("50 kg (110 lb)");
  });
});

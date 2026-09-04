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
  formatTime,
  formatWeight,
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

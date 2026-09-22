import { describe, expect, test } from "bun:test";

import {
  matchesRepeatPattern,
  resolvePeakDateCharges,
  type PeakDateContext,
} from "@/lib/policies/peak-dates";
import type { PeakSurcharge } from "@/types/boarding";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// Three rules MoéGo's peak-dates pricing states and this product did not
// implement, each of which decides money:
//
//   1. Overlapping rules charge the HIGHEST on a date, not the sum. The old
//      evaluator pushed an adjustment per matching rule, so a guest inside two
//      peak windows paid both.
//   2. `repeatPattern` — days of the week, every X weeks, inside a window. The
//      field had been in the schema since the parity pass and NOTHING read it,
//      so a "Friday and Saturday" rule charged every night of its span.
//   3. `chargePerLodging` — same, read by nothing.
//
// And one property that must NOT change: for rules that do not overlap, every
// total is what it was before the walk was inverted. That is the whole licence
// for restructuring a live pricing path, so it is asserted first.

function rule(overrides: Partial<PeakSurcharge> = {}): PeakSurcharge {
  return {
    id: "peak-1",
    name: "Summer peak",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    surchargePercent: 0,
    surchargeType: "flat",
    surchargeAmount: 10,
    scope: "per_each_pet",
    applicableServices: ["boarding"],
    isActive: true,
    ...overrides,
  };
}

function context(overrides: Partial<PeakDateContext> = {}): PeakDateContext {
  return {
    serviceId: "boarding",
    // Four nights, Wed 1 July 2026 through Sat 4 July.
    unitDates: ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04"],
    perUnitBase: 100,
    petCount: 1,
    lodgingCount: 1,
    ...overrides,
  };
}

function totalOf(charges: { amount: number }[]): number {
  return charges.reduce((sum, charge) => sum + charge.amount, 0);
}

describe("the arithmetic that must not have moved", () => {
  test("a flat rule is amount x nights x pets", () => {
    const charges = resolvePeakDateCharges(
      [rule({ surchargeAmount: 10 })],
      context({ petCount: 3 }),
    );
    expect(totalOf(charges)).toBe(120); // 10 x 4 nights x 3 pets
  });

  test("first pet only charges once a night, however many pets", () => {
    const charges = resolvePeakDateCharges(
      [rule({ scope: "first_pet_only" })],
      context({ petCount: 3 }),
    );
    expect(totalOf(charges)).toBe(40); // 10 x 4 nights x 1
  });

  test("a percentage rule takes its cut of the nights it covers", () => {
    const charges = resolvePeakDateCharges(
      [
        rule({
          surchargeType: "percentage",
          surchargePercent: 20,
          startDate: "2026-07-03",
          endDate: "2026-07-31",
        }),
      ],
      context(),
    );
    // Two of the four nights are in range, at 20% of $100 each.
    expect(totalOf(charges)).toBe(40);
  });

  test("a rule stored before surchargeType existed is still a percentage", () => {
    // The live default. Reading these as flat would turn 20 percent of a
    // night into twenty dollars, on rules nobody edited.
    const legacy = rule();
    delete legacy.surchargeType;
    delete legacy.surchargeAmount;
    legacy.surchargePercent = 20;

    const charges = resolvePeakDateCharges([legacy], context());
    expect(totalOf(charges)).toBe(80); // 20% of $100, four nights
  });

  test("several date ranges in one rule all charge", () => {
    // MoéGo: "the surcharge will be applied for all included date ranges".
    const charges = resolvePeakDateCharges(
      [
        rule({
          dateMode: "specific",
          dateRanges: [
            { start: "2026-07-01", end: "2026-07-01" },
            { start: "2026-07-04", end: "2026-07-04" },
          ],
        }),
      ],
      context(),
    );
    expect(totalOf(charges)).toBe(20); // the first and last nights only
  });

  test("holiday dates still decide a holiday rule", () => {
    const charges = resolvePeakDateCharges(
      [
        rule({
          dateMode: "holiday",
          holidayDates: ["2026-07-02"],
          surchargeAmount: 25,
        }),
      ],
      context(),
    );
    expect(totalOf(charges)).toBe(25);
  });

  test("an inactive rule and a rule for another service both charge nothing", () => {
    expect(
      resolvePeakDateCharges([rule({ isActive: false })], context()),
    ).toEqual([]);
    expect(
      resolvePeakDateCharges(
        [rule({ applicableServices: ["grooming"] })],
        context(),
      ),
    ).toEqual([]);
  });

  test("the `all` sentinel covers boarding", () => {
    const charges = resolvePeakDateCharges(
      [rule({ applicableServices: ["all"] })],
      context(),
    );
    expect(totalOf(charges)).toBe(40);
  });
});

describe("two rules over the same night", () => {
  // MoéGo: "If multiple Peak Date rules overlap on the same date, the system
  // will automatically apply the highest surcharge." The old evaluator
  // charged both, every time.
  test("the dearer one wins, and the cheaper adds nothing", () => {
    const cheap = rule({ id: "cheap", name: "Cheap", surchargeAmount: 10 });
    const dear = rule({ id: "dear", name: "Dear", surchargeAmount: 15 });

    const charges = resolvePeakDateCharges([cheap, dear], context());

    expect(totalOf(charges)).toBe(60); // 15 x 4 nights, not 25 x 4
    expect(charges).toHaveLength(1);
    expect(charges[0].ruleId).toBe("dear");
  });

  test("list order does not decide it", () => {
    const cheap = rule({ id: "cheap", surchargeAmount: 10 });
    const dear = rule({ id: "dear", surchargeAmount: 15 });

    expect(totalOf(resolvePeakDateCharges([dear, cheap], context()))).toBe(60);
    expect(totalOf(resolvePeakDateCharges([cheap, dear], context()))).toBe(60);
  });

  test("each night is decided on its own, so both rules can appear", () => {
    // The dear rule covers the last two nights only; the cheap one covers all
    // four. Expected: cheap wins nights 1-2, dear wins nights 3-4.
    const cheap = rule({ id: "cheap", name: "Cheap", surchargeAmount: 10 });
    const dear = rule({
      id: "dear",
      name: "Dear",
      surchargeAmount: 15,
      startDate: "2026-07-03",
      endDate: "2026-07-31",
    });

    const charges = resolvePeakDateCharges([cheap, dear], context());

    expect(totalOf(charges)).toBe(50); // (10 x 2) + (15 x 2)
    const byId = Object.fromEntries(charges.map((c) => [c.ruleId, c]));
    expect(byId.cheap.dates).toEqual(["2026-07-01", "2026-07-02"]);
    expect(byId.dear.dates).toEqual(["2026-07-03", "2026-07-04"]);
  });

  test("highest is measured in dollars, not in the stored number", () => {
    // 5% of a $100 night is $5; a flat $10 is dearer. Comparing the raw
    // figures would read 5 against 10 and reach the right answer by luck, so
    // this one makes the percentage the WINNER at a smaller stored number.
    const percentage = rule({
      id: "pct",
      surchargeType: "percentage",
      surchargePercent: 30, // $30 a night
      surchargeAmount: undefined,
    });
    const flat = rule({ id: "flat", surchargeAmount: 12 });

    const charges = resolvePeakDateCharges([percentage, flat], context());
    expect(charges).toHaveLength(1);
    expect(charges[0].ruleId).toBe("pct");
    expect(totalOf(charges)).toBe(120); // 30 x 4
  });

  test("a tie keeps the first rule and charges once", () => {
    const first = rule({ id: "first", surchargeAmount: 10 });
    const second = rule({ id: "second", surchargeAmount: 10 });

    const charges = resolvePeakDateCharges([first, second], context());
    expect(charges).toHaveLength(1);
    expect(charges[0].ruleId).toBe("first");
    expect(totalOf(charges)).toBe(40);
  });
});

describe("repeat dates", () => {
  // 2026-07-01 is a Wednesday. Day numbers are 0=Sunday.
  const weekendPattern = {
    daysOfWeek: [5, 6], // Friday, Saturday
    everyXWeeks: 1,
    windowStart: "2026-07-01",
    windowEnd: "2026-07-31",
  };

  test("only the chosen weekdays match", () => {
    expect(matchesRepeatPattern(weekendPattern, "2026-07-03")).toBe(true); // Fri
    expect(matchesRepeatPattern(weekendPattern, "2026-07-04")).toBe(true); // Sat
    expect(matchesRepeatPattern(weekendPattern, "2026-07-05")).toBe(false); // Sun
    expect(matchesRepeatPattern(weekendPattern, "2026-07-01")).toBe(false); // Wed
  });

  test("dates outside the window never match", () => {
    expect(matchesRepeatPattern(weekendPattern, "2026-06-26")).toBe(false);
    expect(matchesRepeatPattern(weekendPattern, "2026-08-07")).toBe(false);
  });

  test("every 2 weeks skips the week between, counted from the window start", () => {
    const fortnightly = { ...weekendPattern, everyXWeeks: 2 };
    // Week 0 is 1-7 July, week 1 is 8-14, week 2 is 15-21.
    expect(matchesRepeatPattern(fortnightly, "2026-07-03")).toBe(true); // wk 0
    expect(matchesRepeatPattern(fortnightly, "2026-07-10")).toBe(false); // wk 1
    expect(matchesRepeatPattern(fortnightly, "2026-07-17")).toBe(true); // wk 2
    expect(matchesRepeatPattern(fortnightly, "2026-07-24")).toBe(false); // wk 3
  });

  test("no weekdays chosen matches nothing", () => {
    expect(
      matchesRepeatPattern({ ...weekendPattern, daysOfWeek: [] }, "2026-07-03"),
    ).toBe(false);
  });

  test("a weekend rule charges the weekend nights and not the week", () => {
    // THE DEFECT. Before this, `dateMode: "repeat"` fell through to the plain
    // start/end span and charged all seven nights.
    const charges = resolvePeakDateCharges(
      [
        rule({
          dateMode: "repeat",
          repeatPattern: weekendPattern,
          surchargeAmount: 5,
        }),
      ],
      context({
        unitDates: [
          "2026-07-01", // Wed
          "2026-07-02", // Thu
          "2026-07-03", // Fri
          "2026-07-04", // Sat
          "2026-07-05", // Sun
          "2026-07-06", // Mon
          "2026-07-07", // Tue
        ],
      }),
    );

    expect(totalOf(charges)).toBe(10); // two nights at $5, not seven at $5
    expect(charges[0].dates).toEqual(["2026-07-03", "2026-07-04"]);
  });

  test("a repeat rule saved without a pattern falls back to its own span", () => {
    // Half-saved should behave like the simple rule it looks like, not stop
    // charging with nothing on screen to say why.
    const charges = resolvePeakDateCharges(
      [rule({ dateMode: "repeat", repeatPattern: undefined })],
      context(),
    );
    expect(totalOf(charges)).toBe(40);
  });
});

describe("charge per lodging", () => {
  // MoéGo offers it under "For first pet" only: it widens the charge from one
  // per booking to one per lodging.
  test("first pet only, per lodging, charges once for each room", () => {
    const charges = resolvePeakDateCharges(
      [rule({ scope: "first_pet_only", chargePerLodging: true })],
      context({ petCount: 4, lodgingCount: 2 }),
    );
    expect(totalOf(charges)).toBe(80); // 10 x 4 nights x 2 lodgings
  });

  test("without the flag it stays one charge a night", () => {
    const charges = resolvePeakDateCharges(
      [rule({ scope: "first_pet_only" })],
      context({ petCount: 4, lodgingCount: 2 }),
    );
    expect(totalOf(charges)).toBe(40);
  });

  test("it does nothing under per-each-pet, where every pet already pays", () => {
    const charges = resolvePeakDateCharges(
      [rule({ scope: "per_each_pet", chargePerLodging: true })],
      context({ petCount: 4, lodgingCount: 2 }),
    );
    expect(totalOf(charges)).toBe(160); // 10 x 4 nights x 4 pets
  });

  test("with no room assigned yet it charges once, not zero", () => {
    const charges = resolvePeakDateCharges(
      [rule({ scope: "first_pet_only", chargePerLodging: true })],
      context({ petCount: 2, lodgingCount: 1 }),
    );
    expect(totalOf(charges)).toBe(40);
  });
});

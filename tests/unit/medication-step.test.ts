import { describe, expect, test } from "bun:test";

import type { AppLocale } from "@/lib/language-settings";
import {
  careChargeLines,
  careChargeTotal,
  MEDICATION_FEE_ID,
  MEALS_FEE_ID,
  providedCharge,
  providedFeeId,
} from "@/lib/medications/charges";
import { describeMedication } from "@/lib/medications/describe";
import {
  doseWords,
  formatAmount,
  parseAmount,
  stepDown,
  stepUp,
  takesSingular,
  unitWord,
} from "@/lib/medications/dose";
import {
  blankDraft,
  draftFromItem,
  draftProblem,
  itemFromDraft,
  itemFromProfile,
  offeredDayRules,
  profileAfterBooking,
  profileEntryOf,
  type DraftContext,
} from "@/lib/medications/draft";
import {
  activeDays,
  bookingStay,
  daysBetween,
  doseCount,
  isActiveOn,
  stayOf,
  stayRows,
  supplyCheck,
  type MedStay,
} from "@/lib/medications/schedule";
import {
  DOSE,
  METHODS_BY_FORM,
  pageFormOf,
} from "@/lib/medications/vocabulary";
import { NO_CARE_FEES, type CareFees } from "@/lib/settings/care-fees";
import {
  medicationInstructionsSchema,
  SHIPPED_MEDICATION_INSTRUCTIONS,
  type MedicationInstructions,
} from "@/lib/settings/medication-instructions";
import { shellText } from "@/lib/shell/text";
import type { MedicationItem } from "@/types/booking";

// The client's design for the booking form's Medications step, pinned: each
// form's quick picks and steps, the split question, the supply check that
// counts partial tablets, the panel's days — and the charge for what the
// facility supplies, which the form shows and the server writes from the same
// function.

const en = (key: string) => shellText("en", "booking", key);
const fr = (key: string) => shellText("fr", "booking", key);

/** The mock's stay: Tue Mar 17 to Sat Mar 21 — four nights. */
const BOARDING: MedStay = stayOf({
  overnight: true,
  start: "2026-03-17",
  end: "2026-03-21",
});
const DAYCARE: MedStay = stayOf({
  overnight: false,
  dates: ["2026-03-19", "2026-03-17", "2026-03-23"],
});

/** The facility sells pill pockets, at the design's $0.75 a dose. */
const WITH_POCKETS: MedicationInstructions = {
  ...SHIPPED_MEDICATION_INSTRUCTIONS,
  methods: SHIPPED_MEDICATION_INSTRUCTIONS.methods.map((row) =>
    row.id === "pill_pocket"
      ? { ...row, sell: true, price: 0.75, per: "dose" as const }
      : row,
  ),
};

/** The mock's Bella: Apoquel 16 mg, morning and evening, in a pill pocket. */
const APOQUEL: MedicationItem = {
  id: "med-apoquel",
  petId: 1,
  name: "Apoquel",
  strength: "16 mg",
  amount: "1 tablet",
  doseAmount: 1,
  doseUnit: "tablet",
  form: "tablet",
  frequency: "twice_daily",
  times: ["18:00", "08:00"],
  dayRule: "except_checkout",
  adminInstructions: ["with_food"],
  food: "with",
  givenWith: "pill_pocket",
  facilityProvidesMedAid: true,
  facilityMedAidItem: "pill_pocket",
  notes: "",
  supplyCount: 8,
  drugAllergies: ["Penicillin"],
};

describe("each form doses the way the design says", () => {
  test("quick picks, steps and what shows as a fraction", () => {
    expect(DOSE.tablet).toMatchObject({
      presets: [0.25, 0.5, 1, 1.5, 2],
      step: 0.25,
      fraction: true,
      splittable: true,
    });
    expect(DOSE.chewable).toMatchObject({ step: 0.5, splittable: true });
    expect(DOSE.capsule).toMatchObject({
      presets: [1, 2, 3],
      step: 1,
      splittable: false,
      note: "capsule",
    });
    expect(DOSE.liquid).toMatchObject({ step: 0.1, fraction: false });
    expect(DOSE.injection).toMatchObject({
      units: ["ml", "units"],
      step: 0.05,
      fraction: false,
      note: "injection",
    });
    expect(DOSE.powder.units).toEqual(["scoop", "packet", "tsp"]);
    expect(DOSE.topical.units).toEqual(["pump", "application", "patch"]);
    expect(DOSE.other.units).toEqual(["custom"]);
  });

  test("drops are given in an eye or an ear, capsules any solid way", () => {
    expect(METHODS_BY_FORM.drops).toEqual(["eye", "ear", "other"]);
    expect(METHODS_BY_FORM.capsule).toContain("mixed_in_food");
    expect(METHODS_BY_FORM.injection).toEqual([
      "administered_by_staff",
      "other",
    ]);
  });

  test("an older row's form reads as one the step offers", () => {
    expect(pageFormOf("pill")).toBe("tablet");
    expect(pageFormOf("eye_drops")).toBe("drops");
    expect(pageFormOf("ear_drops")).toBe("drops");
    expect(pageFormOf("liquid")).toBe("liquid");
    expect(pageFormOf("daily")).toBe("other");
  });
});

describe("one dose in words", () => {
  test("quarters and halves are glyphs; measured amounts are decimals", () => {
    expect(formatAmount(1.5, true, "en")).toBe("1½");
    expect(formatAmount(0.5, true, "en")).toBe("½");
    expect(formatAmount(0.25, true, "en")).toBe("¼");
    expect(formatAmount(2, true, "en")).toBe("2");
    expect(formatAmount(2.5, false, "en")).toBe("2.5");
    expect(formatAmount(0.25, false, "fr")).toBe("0,25");
  });

  test("singular up to one in English, below two in French", () => {
    expect(takesSingular(0.5, "en")).toBe(true);
    expect(takesSingular(1, "en")).toBe(true);
    expect(takesSingular(1.5, "en")).toBe(false);
    expect(takesSingular(1.5, "fr")).toBe(true);
    expect(takesSingular(2, "fr")).toBe(false);
  });

  test("the summary line: '1½ tablets per dose'", () => {
    const dose = (amount: number, locale: AppLocale = "en") =>
      doseWords(
        locale === "en" ? en : fr,
        { form: "tablet", amount, unit: "tablet" },
        locale,
      );
    expect(dose(1.5)).toBe("1½ tablets");
    expect(dose(0.5)).toBe("½ tablet");
    expect(dose(2)).toBe("2 tablets");
    expect(dose(1.5, "fr")).toBe("1½ comprimé");
    expect(
      doseWords(en, { form: "liquid", amount: 2.5, unit: "ml" }, "en"),
    ).toBe("2.5 ml");
  });

  test("Other carries its own unit, made plural the regular way", () => {
    expect(unitWord(en, "custom", 2, "en", "spray")).toBe("sprays");
    expect(unitWord(en, "custom", 1, "en", "spray")).toBe("spray");
    expect(unitWord(en, "custom", 2, "en", "")).toBe("doses");
    expect(unitWord(en, "units", 2, "en")).toBe("units");
  });

  test("− never goes below one step; + steps by the form's size", () => {
    expect(stepDown(0.25, 0.25)).toBe(0.25);
    expect(stepDown(1, 0.25)).toBe(0.75);
    expect(stepUp(0.1, 0.05)).toBe(0.15);
    expect(stepUp(1.5, 0.5)).toBe(2);
  });

  test("an older row's amount is read from its words", () => {
    expect(parseAmount("1/2 tablet")).toBe(0.5);
    expect(parseAmount("1 1/2")).toBe(1.5);
    expect(parseAmount("1½ tablets")).toBe(1.5);
    expect(parseAmount("2,5 ml")).toBe(2.5);
    expect(parseAmount("as directed")).toBeUndefined();
  });
});

describe("which days, which times", () => {
  test("a stay's days, both ends included", () => {
    expect(daysBetween("2026-03-17", "2026-03-21")).toHaveLength(5);
    expect(daysBetween("2026-03-30", "2026-04-02")).toEqual([
      "2026-03-30",
      "2026-03-31",
      "2026-04-01",
      "2026-04-02",
    ]);
    expect(DAYCARE.days).toEqual(["2026-03-17", "2026-03-19", "2026-03-23"]);
  });

  test("every day except checkout leaves the last day out", () => {
    expect(activeDays(APOQUEL, BOARDING)).toEqual([
      "2026-03-17",
      "2026-03-18",
      "2026-03-19",
      "2026-03-20",
    ]);
    expect(activeDays({ dayRule: "every_day" }, BOARDING)).toHaveLength(5);
    expect(
      activeDays(
        {
          dayRule: "certain_dates",
          specificDays: ["2026-03-18", "2026-03-30"],
        },
        BOARDING,
      ),
    ).toEqual(["2026-03-18"]);
  });

  test("a daycare booking has no checkout day: 'except checkout' is every day", () => {
    expect(activeDays(APOQUEL, DAYCARE)).toEqual(DAYCARE.days);
    expect(offeredDayRules(SHIPPED_MEDICATION_INSTRUCTIONS, DAYCARE)).toEqual([
      "every_day",
      "certain_dates",
    ]);
  });

  test("a dose is due only on its days — the checkout gate asks this", () => {
    expect(isActiveOn(APOQUEL, "2026-03-21", BOARDING)).toBe(false);
    expect(isActiveOn(APOQUEL, "2026-03-20", BOARDING)).toBe(true);
    // A row written before the rule existed was given every day.
    expect(isActiveOn({}, "2026-03-21", BOARDING)).toBe(true);
    // Without the stay, chosen dates are still honoured.
    expect(
      isActiveOn(
        { dayRule: "certain_dates", specificDays: ["2026-03-18"] },
        "2026-03-19",
      ),
    ).toBe(false);
    // Still in the building after the booked checkout: the tablet goes on,
    // but a chosen-dates medication keeps to its dates.
    expect(isActiveOn(APOQUEL, "2026-03-22", BOARDING)).toBe(true);
    expect(
      isActiveOn(
        { dayRule: "certain_dates", specificDays: ["2026-03-18"] },
        "2026-03-22",
        BOARDING,
      ),
    ).toBe(false);
  });

  test("a saved booking's stay comes from its own days", () => {
    expect(
      bookingStay({
        service: "boarding",
        startDate: "2026-03-17",
        endDate: "2026-03-21",
      }),
    ).toEqual(BOARDING);
    // A daycare booking is a visit: "except checkout" is every day.
    const visit = bookingStay({
      service: "daycare",
      startDate: "2026-03-17",
      endDate: "2026-03-17",
    });
    expect(visit).toEqual({ days: ["2026-03-17"], overnight: false });
    expect(isActiveOn(APOQUEL, "2026-03-17", visit)).toBe(true);
  });

  test("doses over the stay: days × times", () => {
    expect(doseCount(APOQUEL, BOARDING)).toBe(8);
  });

  test("the panel: a row a day, check-in and checkout tagged, doses by time", () => {
    const rows = stayRows([APOQUEL], BOARDING);
    expect(rows.map((row) => row.tag)).toEqual([
      "check_in",
      null,
      null,
      null,
      "checkout",
    ]);
    expect(rows[0].doses).toEqual([
      { time: "08:00", name: "Apoquel" },
      { time: "18:00", name: "Apoquel" },
    ]);
    expect(rows[4].doses).toEqual([]);
    expect(stayRows([APOQUEL], DAYCARE).every((r) => r.tag === null)).toBe(
      true,
    );
  });
});

describe("the supply check counts partial tablets", () => {
  test("½ tablet twice a day for 4 days needs 4 tablets", () => {
    expect(
      supplyCheck({ doses: 8, amount: 0.5, wholeUnits: true, brought: null }),
    ).toEqual({ kind: "needed", need: 4, exact: 4 });
  });

  test("¼ a day for 5 days uses 1¼, so 2 have to come — and it says so", () => {
    expect(
      supplyCheck({ doses: 5, amount: 0.25, wholeUnits: true, brought: null }),
    ).toEqual({ kind: "needed", need: 2, exact: 1.25 });
  });

  test("short, enough, and nothing scheduled yet", () => {
    expect(
      supplyCheck({ doses: 8, amount: 0.5, wholeUnits: true, brought: 3 }),
    ).toEqual({ kind: "short", need: 4, exact: 4, short: 1 });
    expect(
      supplyCheck({ doses: 8, amount: 0.5, wholeUnits: true, brought: 4 }),
    ).toEqual({ kind: "enough", need: 4, exact: 4 });
    expect(
      supplyCheck({ doses: 0, amount: 1, wholeUnits: true, brought: 2 }),
    ).toEqual({ kind: "unscheduled" });
  });

  test("a measured amount stays exact", () => {
    expect(
      supplyCheck({ doses: 3, amount: 2.5, wholeUnits: false, brought: null }),
    ).toEqual({ kind: "needed", need: 7.5, exact: 7.5 });
  });
});

describe("the editor and the record it saves", () => {
  const context: DraftContext = { settings: WITH_POCKETS, stay: BOARDING };

  test("a new medication starts as the design's", () => {
    const draft = blankDraft(1, context);
    expect(draft).toMatchObject({
      petId: 1,
      form: "tablet",
      amount: 1,
      unit: "tablet",
      splitBy: "owner",
      side: "both",
      dayRule: "except_checkout",
      slots: ["morning"],
      custom: [],
      food: "with",
      method: "",
      source: "own",
      saveToProfile: true,
    });
    expect(draft.certainDays).toEqual(BOARDING.days.slice(0, 4));
    expect(draftProblem(draft, context)).toBe("name");
  });

  test("the record keeps every field older screens read", () => {
    const draft = {
      ...blankDraft(1, context),
      name: "Apoquel",
      strength: "16 mg",
      amount: 0.5,
      splitBy: "staff" as const,
      slots: ["morning" as const, "evening" as const],
      method: "pill_pocket" as const,
      source: "facility" as const,
    };
    const item = itemFromDraft(draft, { ...context, t: en, locale: "en" });
    expect(item).toMatchObject({
      name: "Apoquel",
      strength: "16 mg",
      form: "tablet",
      amount: "½ tablet",
      doseAmount: 0.5,
      doseUnit: "tablet",
      splitBy: "staff",
      dayRule: "except_checkout",
      times: ["08:00", "18:00"],
      frequency: "twice_daily",
      food: "with",
      adminInstructions: ["with_food"],
      givenWith: "pill_pocket",
      facilityProvidesMedAid: true,
      facilityMedAidItem: "pill_pocket",
    });
    expect(item.side).toBeUndefined();
    expect(item.specificDays).toBeUndefined();
  });

  test("a whole dose has no one to split it; a waiver needs a supply", () => {
    const whole = itemFromDraft(
      { ...blankDraft(1, context), name: "X", splitBy: "staff" },
      { ...context, t: en, locale: "en" },
    );
    expect(whole.splitBy).toBeUndefined();
    const own = itemFromDraft(
      { ...blankDraft(1, context), name: "X", waived: true },
      { ...context, t: en, locale: "en" },
    );
    expect(own.aidWaived).toBeUndefined();
    expect(own.facilityProvidesMedAid).toBeUndefined();
  });

  test("an older row opens in the editor as well as its words allow", () => {
    const draft = draftFromItem(
      {
        id: "old",
        name: "Ear cleaner",
        amount: "1/2 dropper",
        form: "ear_drops",
        frequency: "once_daily",
        times: ["08:00", "14:30"],
        adminInstructions: ["empty_stomach"],
        notes: "Left ear",
      },
      context,
    );
    expect(draft).toMatchObject({
      form: "drops",
      unit: "drop",
      amount: 0.5,
      method: "ear",
      food: "empty",
      dayRule: "every_day",
      slots: ["morning"],
      custom: ["14:30"],
      notes: "Left ear",
    });
  });

  test("Next waits on a named medication with no day or time", () => {
    const draft = {
      ...blankDraft(1, context),
      name: "Apoquel",
      dayRule: "certain_dates" as const,
      certainDays: [],
      labelConfirmed: true,
    };
    expect(draftProblem(draft, context)).toBe("schedule");
    expect(
      draftProblem({ ...draft, certainDays: ["2026-03-18"] }, context),
    ).toBe(null);
    expect(
      draftProblem(
        { ...draft, certainDays: ["2026-03-18"], amount: 0 },
        context,
      ),
    ).toBe("amount");
  });

  test("the safety rules: the label, the supply, controlled substances", () => {
    const draft = {
      ...blankDraft(1, context),
      name: "Apoquel",
      supply: "2",
    };
    // The pharmacy label is asked for as the page ships.
    expect(draftProblem(draft, context)).toBe("label");
    const labelled = { ...draft, labelConfirmed: true };
    // A short supply warns as the page ships, and stops the medication
    // where the facility requires enough.
    expect(draftProblem(labelled, context)).toBe(null);
    const strict: DraftContext = {
      ...context,
      settings: { ...context.settings, supply: "block" },
    };
    expect(draftProblem(labelled, strict)).toBe("supply");
    // Controlled substances are refused as the page ships, by any name.
    expect(
      draftProblem({ ...labelled, name: "Gabapentin", supply: "99" }, context),
    ).toBe("controlled");
    expect(
      draftProblem(
        { ...labelled, name: "neurontin 100mg", supply: "99" },
        context,
      ),
    ).toBe("controlled");
    const accepting: DraftContext = {
      ...context,
      settings: {
        ...context.settings,
        rules: { ...context.settings.rules, controlled: true },
      },
    };
    expect(
      draftProblem(
        { ...labelled, name: "Gabapentin", supply: "99" },
        accepting,
      ),
    ).toBe(null);
  });
});

describe("the pet's profile", () => {
  test("a saved medication keeps nothing that belonged to one stay", () => {
    const entry = profileEntryOf(
      { ...APOQUEL, aidWaived: true, saveToProfile: true },
      "p1",
    );
    expect(entry.profileId).toBe("p1");
    for (const key of [
      "id",
      "petId",
      "dayRule",
      "specificDays",
      "aidWaived",
      "supplyCount",
      "saveToProfile",
    ]) {
      expect(entry).not.toHaveProperty(key);
    }
  });

  test("the next booking starts with it, on its own stay", () => {
    const item = itemFromProfile(profileEntryOf(APOQUEL, "p1"), 1, {
      settings: SHIPPED_MEDICATION_INSTRUCTIONS,
      stay: DAYCARE,
    });
    expect(item).toMatchObject({
      petId: 1,
      profileId: "p1",
      name: "Apoquel",
      dayRule: "every_day",
      saveToProfile: true,
    });
    expect(item.id).not.toBe(APOQUEL.id);
  });

  test("added, updated, taken off when unticked, and nothing written when unchanged", () => {
    const ids = ["p-new"];
    const added = profileAfterBooking(
      [],
      [{ ...APOQUEL, saveToProfile: true }],
      () => ids.shift()!,
    );
    expect(added?.map((m) => m.profileId)).toEqual(["p-new"]);
    const same = profileAfterBooking(added!, [
      { ...APOQUEL, profileId: "p-new", saveToProfile: true },
    ]);
    expect(same).toBeNull();
    const removed = profileAfterBooking(added!, [
      { ...APOQUEL, profileId: "p-new", saveToProfile: false },
    ]);
    expect(removed).toEqual([]);
  });
});

describe("what the medications add to the bill", () => {
  const FEES: CareFees = {
    daycareFeeding: { enabled: true, amount: 3, scope: "per_meal" },
  };
  // And an administration fee: $0.50 a dose (the Feeding & medications page).
  const WITH_FEE: MedicationInstructions = {
    ...WITH_POCKETS,
    fee: { mode: "dose", amount: 0.5, injection: 5 },
  };

  test("pill pockets: 8 doses × $0.75 = $6.00, as the design shows", () => {
    expect(providedCharge(APOQUEL, BOARDING, WITH_POCKETS)).toMatchObject({
      method: "pill_pocket",
      quantity: 8,
      unitPrice: 0.75,
      amount: 6,
      waived: false,
    });
  });

  test("per day counts the days given, not the doses", () => {
    const perDay = {
      methods: WITH_POCKETS.methods.map((row) =>
        row.id === "pill_pocket" ? { ...row, per: "day" as const } : row,
      ),
    };
    expect(providedCharge(APOQUEL, BOARDING, perDay)?.quantity).toBe(4);
  });

  test("nothing is charged until a facility supplies and prices it", () => {
    expect(
      providedCharge(APOQUEL, BOARDING, SHIPPED_MEDICATION_INSTRUCTIONS),
    ).toBeNull();
    const lines = careChargeLines({
      fees: NO_CARE_FEES,
      settings: SHIPPED_MEDICATION_INSTRUCTIONS,
      service: "boarding",
      parts: [{ stay: BOARDING, medications: [APOQUEL] }],
    });
    expect(lines).toEqual([[]]);
  });

  test("a waived supply is no line", () => {
    const lines = careChargeLines({
      fees: NO_CARE_FEES,
      settings: WITH_POCKETS,
      service: "boarding",
      parts: [
        { stay: BOARDING, medications: [{ ...APOQUEL, aidWaived: true }] },
      ],
    });
    expect(lines.flat()).toEqual([]);
  });

  test("one line per thing supplied, summed over the medications using it", () => {
    const second = { ...APOQUEL, id: "med-2", petId: 2, times: ["12:00"] };
    const lines = careChargeLines({
      fees: NO_CARE_FEES,
      settings: WITH_POCKETS,
      service: "boarding",
      parts: [{ stay: BOARDING, medications: [APOQUEL, second] }],
    });
    expect(lines[0]).toEqual([
      {
        feeId: providedFeeId("pill_pocket"),
        kind: "provided",
        method: "pill_pocket",
        per: "dose",
        quantity: 12,
        unitPrice: 0.75,
        amount: 9,
        taxedAs: "goods",
      },
    ]);
  });

  test("the medication fee and meals: once per request, on its first booking", () => {
    const parts = DAYCARE.days.map((day) => ({
      stay: { days: [day], overnight: false },
      medications: [APOQUEL],
      feeding: [
        {
          id: "f1",
          petId: 1,
          occasions: [{ id: "o1", label: "AM", time: "09:00", components: [] }],
          source: "parent_brings" as const,
          prepInstructions: [],
          ifRefuses: [],
          frequency: "daily" as const,
          allergies: [],
          notes: "",
        },
      ],
    }));
    const lines = careChargeLines({
      fees: FEES,
      settings: WITH_FEE,
      service: "daycare",
      parts,
    });
    // The administration fee counts every dose over the request — two a
    // day, three days — and the meals fee every meal served, one a day: both
    // once, on the first booking (2026-10-01).
    expect(lines[0].map((line) => [line.feeId, line.quantity])).toEqual([
      [MEDICATION_FEE_ID, 6],
      [MEALS_FEE_ID, 3],
      [providedFeeId("pill_pocket"), 2],
    ]);
    expect(lines[1].map((line) => line.feeId)).toEqual([
      providedFeeId("pill_pocket"),
    ]);
  });

  test("the parts add up to what the form showed for the whole request", () => {
    const whole = careChargeLines({
      fees: FEES,
      settings: WITH_FEE,
      service: "daycare",
      parts: [{ stay: DAYCARE, medications: [APOQUEL] }],
    });
    const split = careChargeLines({
      fees: FEES,
      settings: WITH_FEE,
      service: "daycare",
      parts: DAYCARE.days.map((day) => ({
        stay: { days: [day], overnight: false },
        medications: [APOQUEL],
      })),
    });
    expect(careChargeTotal(split)).toBe(careChargeTotal(whole));
    // Boarding split by room: each room's pets, over the same nights.
    const rex = { ...APOQUEL, id: "med-rex", petId: 2 };
    const boardingWhole = careChargeLines({
      fees: FEES,
      settings: WITH_FEE,
      service: "boarding",
      parts: [{ stay: BOARDING, medications: [APOQUEL, rex] }],
    });
    const boardingSplit = careChargeLines({
      fees: FEES,
      settings: WITH_FEE,
      service: "boarding",
      parts: [
        { stay: BOARDING, medications: [APOQUEL] },
        { stay: BOARDING, medications: [rex] },
      ],
    });
    expect(careChargeTotal(boardingSplit)).toBe(careChargeTotal(boardingWhole));
    expect(careChargeTotal(boardingWhole)).toBe(8 + 12);
  });
});

describe("a medication in words", () => {
  test("the card's three lines, as the design writes them", () => {
    const lines = describeMedication(
      { ...APOQUEL, doseAmount: 0.5, splitBy: "staff" },
      { t: en, locale: "en", stay: BOARDING, settings: WITH_POCKETS },
    );
    expect(lines.dose).toBe("16 mg · ½ tablet (staff to split)");
    expect(lines.schedule).toBe("2× daily · 8:00 AM, 6:00 PM · 4 days");
    expect(lines.method).toBe(
      "Pill pocket · facility provides 8 pill pockets ($6.00)",
    );
    expect(lines.extras).toContain("With food");
    expect(lines.extras).toContain("Drug allergies: Penicillin");
  });

  test("in French, with French times and money", () => {
    const lines = describeMedication(APOQUEL, {
      t: fr,
      locale: "fr",
      stay: BOARDING,
      settings: WITH_POCKETS,
    });
    expect(lines.schedule).toBe("2× par jour · 8 h 00, 18 h 00 · 4 jours");
    expect(lines.method).toContain("6,00 $");
  });

  test("an older row still reads, from its own words", () => {
    const lines = describeMedication(
      {
        id: "old",
        name: "Rimadyl",
        amount: "1 tablet",
        form: "pill",
        frequency: "once_daily",
        times: ["08:00"],
        adminInstructions: [],
        notes: "",
      },
      { t: en, locale: "en" },
    );
    expect(lines.dose).toBe("1 tablet");
    expect(lines.schedule).toBe("1× daily · 8:00 AM");
    expect(lines.method).toBe("Method not set");
  });
});

describe("the facility's settings", () => {
  test("the shipped page is the whole design, supplying nothing", () => {
    expect(
      medicationInstructionsSchema.safeParse(SHIPPED_MEDICATION_INSTRUCTIONS)
        .success,
    ).toBe(true);
    expect(
      SHIPPED_MEDICATION_INSTRUCTIONS.methods.some((row) => row.sell),
    ).toBe(false);
    expect(SHIPPED_MEDICATION_INSTRUCTIONS.fee.mode).toBe("none");
  });

  test("a page with no way to pick a time is refused", () => {
    const none = {
      ...SHIPPED_MEDICATION_INSTRUCTIONS,
      customTimes: false,
      times: SHIPPED_MEDICATION_INSTRUCTIONS.times.map((slot) => ({
        ...slot,
        on: false,
      })),
    };
    expect(medicationInstructionsSchema.safeParse(none).success).toBe(false);
  });

  test("a form must be offered, and a price is never negative", () => {
    expect(
      medicationInstructionsSchema.safeParse({
        ...SHIPPED_MEDICATION_INSTRUCTIONS,
        forms: [],
      }).success,
    ).toBe(false);
    expect(
      medicationInstructionsSchema.safeParse({
        ...SHIPPED_MEDICATION_INSTRUCTIONS,
        methods: WITH_POCKETS.methods.map((row) =>
          row.id === "pill_pocket" ? { ...row, price: -1 } : row,
        ),
      }).success,
    ).toBe(false);
  });
});

import { describe, expect, test } from "bun:test";

import {
  DEFAULT_RESPONSE_HOURS,
  bookingApprovalSchema,
  responseHoursFor,
} from "@/lib/settings/booking-approval";
import {
  careChargeLines,
  INJECTION_FEE_ID,
  MEALS_FEE_ID,
  MEDICATION_FEE_ID,
} from "@/lib/medications/charges";
import { stayOf } from "@/lib/medications/schedule";
import {
  NO_CARE_FEES,
  careFeesSchema,
  type CareFees,
} from "@/lib/settings/care-fees";
import {
  SHIPPED_MEDICATION_INSTRUCTIONS,
  type MedFeeMode,
  type MedicationInstructions,
} from "@/lib/settings/medication-instructions";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";

// The New booking form priced medication and daycare feeding from one fixture,
// for every facility. These pin the rules that replaced it: nothing is charged
// until a facility turns a fee on, and a fee counts what it says it counts.
// Since 2026-10-01 they are lines on the bill (lib/medications/charges.ts),
// and the medication fees are the Feeding & medications page's — per dose,
// per pet per day, or per medication per day, and per injection on top.

const FEES: CareFees = {
  daycareFeeding: { enabled: true, amount: 3, scope: "per_meal" },
};

const med = (
  id: string,
  petId: number,
  times: string[] = ["08:00"],
  form: MedicationItem["form"] = "tablet",
): MedicationItem => ({
  id,
  petId,
  name: id,
  amount: "1 tablet",
  form,
  frequency: "once_daily",
  times,
  adminInstructions: [],
  notes: "",
});

const meal = (
  id: string,
  petId: number,
  meals: number,
): FeedingScheduleItem => ({
  id,
  petId,
  // A meal at a time of its own: two meals at one time are one meal.
  occasions: Array.from({ length: meals }, (_, i) => ({
    id: `${id}-${i}`,
    label: "Meal",
    time: `${String(9 + i * 4).padStart(2, "0")}:00`,
    components: [],
  })),
  source: "parent_brings",
  prepInstructions: [],
  ifRefuses: [],
  frequency: "daily",
  allergies: [],
  notes: "",
});

const stay = stayOf({
  overnight: true,
  start: "2026-03-17",
  end: "2026-03-19",
});

/** The shipped page with a fee: $4, counted as `mode` says. */
const withFee = (
  mode: MedFeeMode,
  patch: Partial<MedicationInstructions> = {},
): MedicationInstructions => ({
  ...SHIPPED_MEDICATION_INSTRUCTIONS,
  fee: { mode, amount: 4, injection: 5 },
  ...patch,
});

// Pet 1 takes a twice-daily medication and a once-daily one; pet 2 one,
// once a day — over three days: 12 doses, 9 medication-days, 6 pet-days.
const MEDS = [med("a", 1, ["08:00", "20:00"]), med("b", 1), med("c", 2)];

function charge(
  settings: MedicationInstructions,
  service: string,
  medications: MedicationItem[] = MEDS,
  fees: CareFees = FEES,
) {
  return careChargeLines({
    fees,
    settings,
    service,
    parts: [
      {
        stay,
        medications,
        feeding: [meal("f1", 1, 2), meal("f2", 2, 1)],
      },
    ],
  })[0];
}

const amountOf = (lines: { feeId: string; amount: number }[], id: string) =>
  lines.find((line) => line.feeId === id)?.amount ?? 0;

describe("care fees", () => {
  test("a facility that has set nothing charges nothing", () => {
    expect(
      charge(SHIPPED_MEDICATION_INSTRUCTIONS, "boarding", MEDS, NO_CARE_FEES),
    ).toEqual([]);
    expect(careFeesSchema.safeParse(NO_CARE_FEES).success).toBe(true);
  });

  test("the administration fee counts what its mode says", () => {
    expect(
      amountOf(charge(withFee("dose"), "boarding"), MEDICATION_FEE_ID),
    ).toBe(48);
    expect(
      amountOf(charge(withFee("med_day"), "boarding"), MEDICATION_FEE_ID),
    ).toBe(36);
    expect(
      amountOf(charge(withFee("pet_day"), "boarding"), MEDICATION_FEE_ID),
    ).toBe(24);
    expect(
      amountOf(charge(withFee("none"), "boarding"), MEDICATION_FEE_ID),
    ).toBe(0);
  });

  test("a pet-day is one, however many medications that day", () => {
    const twoForOnePet = [med("a", 1), med("b", 1)];
    expect(
      amountOf(
        charge(withFee("pet_day"), "boarding", twoForOnePet),
        MEDICATION_FEE_ID,
      ),
    ).toBe(12);
  });

  test("the fee stays off a service whose step is switched off", () => {
    // Grooming has the step off as the page ships.
    expect(
      amountOf(charge(withFee("dose"), "grooming"), MEDICATION_FEE_ID),
    ).toBe(0);
    const daycareOff = withFee("dose", {
      services: {
        ...SHIPPED_MEDICATION_INSTRUCTIONS.services,
        daycare: "disabled",
      },
    });
    expect(amountOf(charge(daycareOff, "daycare"), MEDICATION_FEE_ID)).toBe(0);
    expect(amountOf(charge(daycareOff, "boarding"), MEDICATION_FEE_ID)).toBe(
      48,
    );
  });

  test("injections cost extra only while the form is offered", () => {
    const injected = [...MEDS, med("i", 2, ["09:00"], "injection")];
    // Injection is off as the page ships: no fee for it.
    expect(
      amountOf(charge(withFee("none"), "boarding", injected), INJECTION_FEE_ID),
    ).toBe(0);
    const offered = withFee("none", {
      forms: [...SHIPPED_MEDICATION_INSTRUCTIONS.forms, "injection"],
    });
    // Three injections over the three days, $5 each.
    expect(
      amountOf(charge(offered, "boarding", injected), INJECTION_FEE_ID),
    ).toBe(15);
  });

  test("feeding is charged at daycare only, by meal or by pet", () => {
    const settings = SHIPPED_MEDICATION_INSTRUCTIONS;
    expect(amountOf(charge(settings, "boarding"), MEALS_FEE_ID)).toBe(0);
    // Per meal is every meal served: 3 a day over the 3 days, $3 each
    // (2026-10-01 — it counted one day's meals before).
    expect(amountOf(charge(settings, "daycare"), MEALS_FEE_ID)).toBe(27);
    const perPet = {
      daycareFeeding: { ...FEES.daycareFeeding, scope: "per_pet" as const },
    };
    expect(
      amountOf(charge(settings, "daycare", MEDS, perPet), MEALS_FEE_ID),
    ).toBe(6);
  });

  test("a fee switched on at $0 charges nothing", () => {
    const zero = withFee("dose");
    zero.fee = { ...zero.fee, amount: 0 };
    expect(amountOf(charge(zero, "boarding"), MEDICATION_FEE_ID)).toBe(0);
  });

  test("a stored medication fee from before the page is dropped", () => {
    const parsed = careFeesSchema.parse({
      ...FEES,
      medicationAdmin: { enabled: true, amount: 5, scope: "flat" },
    });
    expect(parsed).toEqual(FEES);
  });
});

describe("booking request response time", () => {
  test("a service with no stored time promises a day", () => {
    expect(responseHoursFor({ responseHours: {} }, "grooming")).toBe(
      DEFAULT_RESPONSE_HOURS,
    );
    expect(
      responseHoursFor({ responseHours: { grooming: 48 } }, "grooming"),
    ).toBe(48);
  });

  test("a response time is whole hours, from one to a month", () => {
    const parse = (hours: number) =>
      bookingApprovalSchema.safeParse({ responseHours: { boarding: hours } })
        .success;
    expect(parse(1)).toBe(true);
    expect(parse(720)).toBe(true);
    expect(parse(0)).toBe(false);
    expect(parse(1.5)).toBe(false);
    expect(parse(721)).toBe(false);
  });
});

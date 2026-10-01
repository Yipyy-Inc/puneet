import { describe, expect, test } from "bun:test";

import {
  DEFAULT_RESPONSE_HOURS,
  bookingApprovalSchema,
  responseHoursFor,
} from "@/lib/settings/booking-approval";
import {
  careChargeLines,
  MEALS_FEE_ID,
  MEDICATION_FEE_ID,
} from "@/lib/medications/charges";
import { stayOf } from "@/lib/medications/schedule";
import {
  NO_CARE_FEES,
  careFeesSchema,
  type CareFees,
} from "@/lib/settings/care-fees";
import { SHIPPED_MEDICATION_INSTRUCTIONS } from "@/lib/settings/medication-instructions";
import type { FeedingScheduleItem, MedicationItem } from "@/types/booking";

// The New booking form priced medication and daycare feeding from one fixture,
// for every facility. These pin the rules that replaced it: nothing is charged
// until a facility turns a fee on, and a fee counts what it says it counts.
// Since 2026-10-01 they are lines on the bill (lib/medications/charges.ts);
// what a facility supplies to give a medication with is priced in the
// medication instructions and pinned in medication-step.test.ts.

const FEES: CareFees = {
  medicationAdmin: {
    enabled: true,
    amount: 4,
    scope: "per_medication",
    services: ["boarding"],
  },
  daycareFeeding: { enabled: true, amount: 3, scope: "per_meal" },
};

const med = (id: string, petId: number): MedicationItem => ({
  id,
  petId,
  name: id,
  amount: "1 tablet",
  form: "tablet",
  frequency: "once_daily",
  times: ["08:00"],
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
  occasions: Array.from({ length: meals }, (_, i) => ({
    id: `${id}-${i}`,
    label: "AM",
    time: "09:00",
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

function charge(fees: CareFees, service: string) {
  return careChargeLines({
    fees,
    settings: SHIPPED_MEDICATION_INSTRUCTIONS,
    service,
    parts: [
      {
        stay,
        medications: [med("a", 1), med("b", 1), med("c", 2)],
        feeding: [meal("f1", 1, 2), meal("f2", 2, 1)],
      },
    ],
  })[0];
}

const amountOf = (lines: { feeId: string; amount: number }[], id: string) =>
  lines.find((line) => line.feeId === id)?.amount ?? 0;

describe("care fees", () => {
  test("a facility that has set nothing charges nothing", () => {
    expect(charge(NO_CARE_FEES, "boarding")).toEqual([]);
    expect(careFeesSchema.safeParse(NO_CARE_FEES).success).toBe(true);
  });

  test("the medication fee counts what its scope says", () => {
    expect(amountOf(charge(FEES, "boarding"), MEDICATION_FEE_ID)).toBe(12);
    const perPet = {
      ...FEES,
      medicationAdmin: { ...FEES.medicationAdmin, scope: "per_pet" as const },
    };
    expect(amountOf(charge(perPet, "boarding"), MEDICATION_FEE_ID)).toBe(8);
    const flat = {
      ...FEES,
      medicationAdmin: { ...FEES.medicationAdmin, scope: "flat" as const },
    };
    expect(amountOf(charge(flat, "boarding"), MEDICATION_FEE_ID)).toBe(4);
  });

  test("the medication fee stays off a service it does not apply to", () => {
    expect(amountOf(charge(FEES, "daycare"), MEDICATION_FEE_ID)).toBe(0);
  });

  test("feeding is charged at daycare only, by meal or by pet", () => {
    expect(amountOf(charge(FEES, "boarding"), MEALS_FEE_ID)).toBe(0);
    expect(amountOf(charge(FEES, "daycare"), MEALS_FEE_ID)).toBe(9);
    const perPet = {
      ...FEES,
      daycareFeeding: { ...FEES.daycareFeeding, scope: "per_pet" as const },
    };
    expect(amountOf(charge(perPet, "daycare"), MEALS_FEE_ID)).toBe(6);
  });

  test("a fee switched on at $0 charges nothing", () => {
    const zero = {
      ...FEES,
      medicationAdmin: { ...FEES.medicationAdmin, amount: 0 },
    };
    expect(amountOf(charge(zero, "boarding"), MEDICATION_FEE_ID)).toBe(0);
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

import { describe, expect, test } from "bun:test";

import {
  DEFAULT_RESPONSE_HOURS,
  bookingApprovalSchema,
  responseHoursFor,
} from "@/lib/settings/booking-approval";
import {
  NO_CARE_FEES,
  careFeeLines,
  careFeesSchema,
  type CareFees,
} from "@/lib/settings/care-fees";

// The New booking form priced medication and daycare feeding from one fixture,
// for every facility. These pin the rules that replaced it: nothing is charged
// until a facility turns a fee on, and a fee counts what it says it counts.

const FEES: CareFees = {
  medicationAdmin: {
    enabled: true,
    amount: 4,
    scope: "per_medication",
    services: ["boarding"],
  },
  medicationAids: {
    enabled: true,
    items: [{ id: "pocket", name: "Pill pocket", fee: 1.5 }],
  },
  daycareFeeding: { enabled: true, amount: 3, scope: "per_meal" },
};

const booking = {
  service: "boarding",
  medications: [
    { petId: 1, facilityMedAidItem: "pocket" },
    { petId: 1, facilityMedAidItem: null },
    { petId: 2 },
  ],
  feedingPetIds: [1, 2],
  feedingMeals: 3,
};

describe("care fees", () => {
  test("a facility that has set nothing charges nothing", () => {
    expect(careFeeLines(NO_CARE_FEES, booking)).toEqual({
      medicationAdmin: 0,
      aids: [],
      feeding: 0,
    });
    expect(careFeesSchema.safeParse(NO_CARE_FEES).success).toBe(true);
  });

  test("the medication fee counts what its scope says", () => {
    expect(careFeeLines(FEES, booking).medicationAdmin).toBe(12);
    const perPet = {
      ...FEES,
      medicationAdmin: { ...FEES.medicationAdmin, scope: "per_pet" as const },
    };
    expect(careFeeLines(perPet, booking).medicationAdmin).toBe(8);
    const flat = {
      ...FEES,
      medicationAdmin: { ...FEES.medicationAdmin, scope: "flat" as const },
    };
    expect(careFeeLines(flat, booking).medicationAdmin).toBe(4);
  });

  test("the medication fee stays off a service it does not apply to", () => {
    expect(
      careFeeLines(FEES, { ...booking, service: "daycare" }).medicationAdmin,
    ).toBe(0);
  });

  test("an aid is charged once per medication that asks for it", () => {
    const { aids } = careFeeLines(FEES, booking);
    expect(aids.map((a) => [a.item.name, a.amount])).toEqual([
      ["Pill pocket", 1.5],
    ]);
    const off = {
      ...FEES,
      medicationAids: { ...FEES.medicationAids, enabled: false },
    };
    expect(careFeeLines(off, booking).aids).toEqual([]);
  });

  test("feeding is charged at daycare only, by meal or by pet", () => {
    expect(careFeeLines(FEES, booking).feeding).toBe(0);
    const daycare = { ...booking, service: "daycare" };
    expect(careFeeLines(FEES, daycare).feeding).toBe(9);
    const perPet = {
      ...FEES,
      daycareFeeding: { ...FEES.daycareFeeding, scope: "per_pet" as const },
    };
    expect(careFeeLines(perPet, daycare).feeding).toBe(6);
    expect(careFeeLines(FEES, { ...daycare, feedingMeals: 0 }).feeding).toBe(0);
  });

  test("a fee switched on at $0 charges nothing", () => {
    const zero = {
      ...FEES,
      medicationAdmin: { ...FEES.medicationAdmin, amount: 0 },
    };
    expect(careFeeLines(zero, booking).medicationAdmin).toBe(0);
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

import { describe, expect, test } from "bun:test";

import { householdStayTotal } from "@/lib/pricing/boarding-service-choice";

// The server's re-price of a household's stay (2026-10-01). The wizard's
// quote makes the same sum line by line (tests/unit/booking-quote.test.ts,
// "boarding, a room per pet"), and a request confirms only when they agree.
const suites = {
  rowId: "svc-suite",
  price: 90,
  unit: "night" as const,
  additionalPetPrice: 45,
};
const condos = {
  rowId: "svc-condo",
  price: 70,
  unit: "night" as const,
  additionalPetPrice: null,
};

describe("householdStayTotal", () => {
  test("a room each, at each pet's service", () => {
    expect(
      householdStayTotal({
        pets: [{ service: suites }, { service: condos }],
        share: false,
        nights: 4,
      }),
    ).toBe(4 * 90 + 4 * 70);
  });

  test("sharing: one room, and the second-pet rate after the first", () => {
    expect(
      householdStayTotal({
        pets: [{ service: suites }, { service: suites }],
        share: true,
        nights: 4,
      }),
    ).toBe(4 * (90 + 45));
  });

  test("sharing with no second-pet rate is the room, once", () => {
    expect(
      householdStayTotal({
        pets: [{ service: condos }, { service: condos }, { service: condos }],
        share: true,
        nights: 2,
      }),
    ).toBe(2 * 70);
  });

  test("not sharing ignores the second-pet rate", () => {
    expect(
      householdStayTotal({
        pets: [{ service: suites }, { service: suites }],
        share: false,
        nights: 1,
      }),
    ).toBe(180);
  });

  test("a day rate counts the days touched", () => {
    expect(
      householdStayTotal({
        pets: [{ service: { ...suites, unit: "day" as const } }],
        share: false,
        nights: 2,
      }),
    ).toBe(3 * 90);
  });

  test("an unpriced service is refused, not guessed", () => {
    expect(
      householdStayTotal({
        pets: [{ service: { ...condos, price: 0 } }],
        share: false,
        nights: 2,
      }),
    ).toBeNull();
  });
});

import { describe, expect, test } from "bun:test";

import { calculatePetAge, estimateDobFromMonths } from "@/lib/pet-utils";

// ============================================================================
// A PUPPY'S AGE, IN MONTHS.
//
// The booking wizard asks for a new pet's age in months and sent it on as
// fractional years — 3 months became `age: 0.3`, which the integer column
// refused, so the pet was never saved and the booking could not be made. It
// sends whole years and a birth date now; these pin the birth date.
// ============================================================================

const at = (iso: string) => new Date(`${iso}T12:00:00`);

describe("estimateDobFromMonths", () => {
  test("the same day, that many months ago", () => {
    expect(estimateDobFromMonths(3, at("2026-09-18"))).toBe("2026-06-18");
    expect(estimateDobFromMonths(14, at("2026-09-18"))).toBe("2025-07-18");
  });

  test("across a year boundary", () => {
    expect(estimateDobFromMonths(3, at("2026-02-10"))).toBe("2025-11-10");
  });

  test("held to the end of a shorter month", () => {
    expect(estimateDobFromMonths(1, at("2026-03-31"))).toBe("2026-02-28");
    expect(estimateDobFromMonths(1, at("2028-03-31"))).toBe("2028-02-29");
    expect(estimateDobFromMonths(3, at("2026-05-31"))).toBe("2026-02-28");
  });

  test("a fraction of a month rounds, and nothing is not negative", () => {
    expect(estimateDobFromMonths(2.6, at("2026-09-18"))).toBe("2026-06-18");
    expect(estimateDobFromMonths(-4, at("2026-09-18"))).toBe("2026-09-18");
  });

  test("the date it gives reads back as the age that was typed", () => {
    const dob = estimateDobFromMonths(3);
    const age = calculatePetAge(dob);
    expect(age.years).toBe(0);
    expect(age.months).toBe(3);
  });
});

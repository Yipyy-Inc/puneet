import { describe, expect, test } from "bun:test";

import { groomPrice, tierPrices } from "@/lib/bookings/wizard/groom-pricing";
import type { GroomingPackage } from "@/types/grooming";
import type { Pet } from "@/types/pet";

// One pet's groom (the client's mock, 2026-10-01): "Full Groom $85 — Small
// base $75 · +$10 curly coat · ◷ 1h 30m".
const TIERS = [
  { id: "small", label: "Small", maxWeightLbs: 15 },
  { id: "medium", label: "Medium", maxWeightLbs: 35 },
  { id: "large", label: "Large", maxWeightLbs: 70 },
  { id: "giant", label: "Giant" },
];

const full = {
  id: "full",
  name: "Full Groom",
  description: "",
  basePrice: 75,
  duration: 90,
  sizePricing: { small: 75, medium: 90, large: 110, giant: 135 },
  sizeDurations: { small: 90, medium: 120, large: 150 },
  coatAdjustments: { curly: 10, double: 15, mode: "flat" },
  mattedSurchargeDefault: 20,
  mattedExtraMinutes: 15,
  includes: [],
  isActive: true,
  purchaseCount: 0,
  createdAt: "",
} as GroomingPackage;

const pet = (over: Partial<Pet> = {}) =>
  ({ id: 1, name: "Bubu", weight: 10, coatType: "curly", ...over }) as Pet;

describe("groomPrice", () => {
  test("the facility's size, its price and minutes, and the coat", () => {
    const groom = groomPrice({ pet: pet(), pkg: full, tiers: TIERS });
    expect(groom.size).toBe("small");
    expect(groom.sizePrice).toBe(75);
    expect(groom.price).toBe(85);
    expect(groom.coat).toEqual({ coatType: "curly", delta: 10 });
    expect(groom.minutes).toBe(90);
  });

  test("a 17 lb dog is Medium by the facility's bands", () => {
    const groom = groomPrice({
      pet: pet({ weight: 17, coatType: "short" }),
      pkg: full,
      tiers: TIERS,
    });
    expect(groom.size).toBe("medium");
    expect(groom.price).toBe(90);
    expect(groom.minutes).toBe(120);
  });

  test("a size with no minutes of its own takes the service's length", () => {
    const groom = groomPrice({
      pet: pet({ weight: 90, coatType: "short" }),
      pkg: full,
      tiers: TIERS,
    });
    expect(groom.size).toBe("giant");
    expect(groom.minutes).toBe(90);
  });

  test("matting adds its surcharge and its minutes", () => {
    const groom = groomPrice({
      pet: pet(),
      pkg: full,
      tiers: TIERS,
      matted: true,
    });
    expect(groom.price).toBe(105);
    expect(groom.minutes).toBe(105);
    expect(groom.matting).toEqual({ amount: 20, minutes: 15 });
  });

  test("no bands is no size: the base price and length", () => {
    const groom = groomPrice({
      pet: pet({ coatType: "short" }),
      pkg: full,
      tiers: [],
    });
    expect(groom.size).toBeNull();
    expect(groom.price).toBe(75);
    expect(groom.minutes).toBe(90);
  });

  test("the tier row lists the sizes the package prices", () => {
    expect(tierPrices(full).map((t) => t.size)).toEqual([
      "small",
      "medium",
      "large",
      "giant",
    ]);
  });
});

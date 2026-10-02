import { describe, expect, test } from "bun:test";

import { serviceCardPrices } from "@/lib/bookings/wizard/service-prices";

describe("serviceCardPrices", () => {
  test("each card quotes the cheapest offer on its own menu, as the mock does", () => {
    expect(
      serviceCardPrices({
        boarding: [
          { price: 90, unit: "night" },
          { price: 70, unit: "night" },
          { price: 50, unit: "night", isActive: false },
        ],
        daycare: [
          { price: 38, maxDurationHours: 10 },
          { price: 45, maxDurationHours: null },
          { price: 25, maxDurationHours: 5 },
        ],
        grooming: [{ basePrice: 75 }, { basePrice: 40 }],
        programs: [{ price: 280 }, { price: 95 }, { price: 140 }],
      }),
    ).toEqual({
      boarding: { amount: 70, unit: "night" },
      daycare: { full: 38, half: 25 },
      grooming: 40,
      training: 95,
    });
  });

  test("a menu with nothing on it quotes nothing", () => {
    expect(
      serviceCardPrices({
        boarding: [{ price: 70, unit: "day", isActive: false }],
        daycare: [],
        grooming: [],
        programs: [{ price: 0 }],
      }),
    ).toEqual({
      boarding: null,
      daycare: { full: null, half: null },
      grooming: null,
      training: null,
    });
  });
});

import { describe, expect, test } from "bun:test";

import { applyDynamicPricingRules } from "@/lib/pricing-rules";
import type { PricingRules } from "@/lib/settings/pricing";
import type {
  MultiNightDiscount,
  MultiPetDiscountRule,
} from "@/types/boarding";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// The two discount rules MoéGo's pricing page describes — "Multiple Pets" and
// "Multiple Nights/Days" — plus the two stacking modes. All of it was already
// built when this file was written on 2026-09-23, and NONE of it had a single
// test: `multiPetDiscounts` and `discountStacking` appeared in
// `custom-fees.test.ts` and `time-fee.test.ts` only as `[]` scaffolding, set
// empty so something else could be measured.
//
// The first block is not about a rule at all. It is about which NUMBER the
// evaluator hands back, because that is where a discount can be given twice.

function rules(over: Partial<PricingRules> = {}): PricingRules {
  return {
    discountStacking: "best_only",
    multiPetDiscounts: [],
    latePickupFees: [],
    exceed24Hour: {
      id: "exceed-24h",
      enabled: false,
      amount: 0,
      scope: "per_pet",
    },
    customFees: [],
    multiNightDiscounts: [],
    peakDateSurcharges: [],
    roomTypeAdjustments: [],
    groomingConditionAdjustments: [],
    serviceBundles: [],
    ...over,
  } as PricingRules;
}

function multiPet(
  over: Partial<MultiPetDiscountRule> = {},
): MultiPetDiscountRule {
  return {
    id: "mp-1",
    name: "Two dogs, one household",
    applicableServices: ["all"],
    isActive: true,
    discountType: "per_pet",
    sameLodging: false,
    tiers: [{ petCount: 2, discountAmount: 5 }],
    ...over,
  };
}

function multiNight(
  over: Partial<MultiNightDiscount> = {},
): MultiNightDiscount {
  return {
    id: "mn-1",
    name: "Long stay",
    minNights: 3,
    maxNights: null,
    discountPercent: 10,
    isActive: true,
    ...over,
  };
}

function quote(over: Record<string, unknown> = {}) {
  return applyDynamicPricingRules({
    rules: rules(),
    serviceId: "boarding",
    basePrice: 100,
    existingExtraServices: [],
    selectedPetIds: [1, 2],
    pets: [{ id: 1 }, { id: 2 }],
    addOnsCatalog: [],
    ...over,
  });
}

describe("which number the evaluator hands back", () => {
  test("`total` is NET of the discount, and `discountTotal` reports it as well", () => {
    // ── THE ONE THAT MATTERS ────────────────────────────────────────────
    //
    // Both facts are true at once, and that is the trap. `total` already has
    // the discount taken off, AND `discountTotal` states it separately. A
    // caller that writes `total_cost` from the first and `discount` from the
    // second has given the discount twice — `bookings.amount_due` is
    // GENERATED as `greatest(0, total_cost + extras_total - discount)` and
    // subtracts it a second time.
    //
    // This test does not say which caller is wrong. It says the two numbers
    // overlap, so anything using both must subtract one of them.
    const result = quote({
      rules: rules({ multiPetDiscounts: [multiPet()] }),
    });

    expect(result.discountTotal, "the discount is reported").toBe(10); // $5 x 2 pets
    expect(result.total, "and is ALREADY off the total").toBe(90);
    expect(
      result.total + result.discountTotal,
      "so the two together come back to the undiscounted price",
    ).toBe(100);
  });

  test("with no rule matching, the two agree trivially", () => {
    const result = quote();
    expect(result.discountTotal).toBe(0);
    expect(result.total).toBe(100);
  });
});

describe("multiple pets", () => {
  test("`per_pet` gives the tier amount to every pet", () => {
    const result = quote({
      rules: rules({
        multiPetDiscounts: [multiPet({ discountType: "per_pet" })],
      }),
    });
    expect(result.discountTotal).toBe(10); // 5 x 2
  });

  test("`additional_pet` skips the first", () => {
    const result = quote({
      rules: rules({
        multiPetDiscounts: [multiPet({ discountType: "additional_pet" })],
      }),
    });
    expect(result.discountTotal).toBe(5); // the second pet only
  });

  test("one pet is never a multi-pet booking", () => {
    const result = quote({
      selectedPetIds: [1],
      pets: [{ id: 1 }],
      rules: rules({ multiPetDiscounts: [multiPet()] }),
    });
    expect(result.discountTotal).toBe(0);
  });

  test("a percentage is a percentage of that pet's share, not of the whole", () => {
    // $100 over two pets is $50 each; 10% of that is $5 a pet.
    const result = quote({
      rules: rules({
        multiPetDiscounts: [
          multiPet({
            discountValueType: "percentage",
            tiers: [{ petCount: 2, discountAmount: 10 }],
          }),
        ],
      }),
    });
    expect(result.discountTotal).toBe(10);
  });

  test("the tier for the pet count is the one that applies", () => {
    const tiered = multiPet({
      tiers: [
        { petCount: 2, discountAmount: 5 },
        { petCount: 3, discountAmount: 10 },
      ],
    });
    const two = quote({ rules: rules({ multiPetDiscounts: [tiered] }) });
    expect(two.discountTotal).toBe(10); // 5 x 2 pets

    const three = quote({
      selectedPetIds: [1, 2, 3],
      pets: [{ id: 1 }, { id: 2 }, { id: 3 }],
      rules: rules({ multiPetDiscounts: [tiered] }),
    });
    expect(three.discountTotal).toBe(30); // 10 x 3 pets
  });

  test("an inactive rule, and a rule for another service, do nothing", () => {
    expect(
      quote({
        rules: rules({ multiPetDiscounts: [multiPet({ isActive: false })] }),
      }).discountTotal,
    ).toBe(0);
    expect(
      quote({
        rules: rules({
          multiPetDiscounts: [multiPet({ applicableServices: ["grooming"] })],
        }),
      }).discountTotal,
    ).toBe(0);
  });
});

describe("same lodging", () => {
  test("with no rooms assigned at all, the rule still applies", () => {
    // Most bookings never name a room. Withholding the discount until
    // somebody assigns one would quietly stop giving it on the common case.
    const result = quote({
      rules: rules({ multiPetDiscounts: [multiPet({ sameLodging: true })] }),
    });
    expect(result.discountTotal).toBe(10);
  });

  test("two pets in one room get it; two rooms do not", () => {
    const together = quote({
      rules: rules({ multiPetDiscounts: [multiPet({ sameLodging: true })] }),
      roomAssignments: [
        { petId: 1, roomId: "r1" },
        { petId: 2, roomId: "r1" },
      ],
    });
    expect(together.discountTotal).toBe(10);

    const apart = quote({
      rules: rules({ multiPetDiscounts: [multiPet({ sameLodging: true })] }),
      roomAssignments: [
        { petId: 1, roomId: "r1" },
        { petId: 2, roomId: "r2" },
      ],
    });
    expect(apart.discountTotal).toBe(0);
  });
});

describe("multiple nights", () => {
  // `boardingNights` is an explicit INPUT, not counted from the dates:
  // `pricing-rules.ts:696` reads `input.boardingNights` with no fallback to
  // the date span the way `totalBillableUnits` has one. `BookingModal.tsx:1712`
  // passes it, so the rule does fire in the product — but a caller that
  // forgets it gets no long-stay discount and no error, which is worth
  // knowing about before writing a third caller.
  const nights = {
    serviceStartDate: "2026-10-01",
    serviceEndDate: "2026-10-05",
    boardingNights: 4,
  };

  test("a percentage off a stay that reaches the floor", () => {
    const result = quote({
      ...nights,
      rules: rules({ multiNightDiscounts: [multiNight()] }),
    });
    expect(result.discountTotal).toBe(10); // 10% of 100
  });

  test("a stay below the floor gets nothing", () => {
    const result = quote({
      serviceStartDate: "2026-10-01",
      serviceEndDate: "2026-10-03",
      boardingNights: 2, // floor is 3
      rules: rules({ multiNightDiscounts: [multiNight()] }),
    });
    expect(result.discountTotal).toBe(0);
  });

  test("a ceiling excludes a stay above it", () => {
    const result = quote({
      ...nights,
      rules: rules({ multiNightDiscounts: [multiNight({ maxNights: 3 })] }),
    });
    expect(result.discountTotal).toBe(0);
  });

  test("a flat amount is the amount", () => {
    const result = quote({
      ...nights,
      rules: rules({
        multiNightDiscounts: [
          multiNight({ discountMode: "flat", discountAmount: 12 }),
        ],
      }),
    });
    expect(result.discountTotal).toBe(12);
  });
});

describe("how discounts combine", () => {
  const twoRules = {
    multiPetDiscounts: [
      multiPet({ tiers: [{ petCount: 2, discountAmount: 10 }] }),
    ],
    multiNightDiscounts: [multiNight({ discountPercent: 5 })],
  };
  const nights = {
    serviceStartDate: "2026-10-01",
    serviceEndDate: "2026-10-05",
    boardingNights: 4,
  };

  test("`apply_all_sequence` gives every matching rule", () => {
    // $10 x 2 pets, plus 5% of 100. ADDITIVE, not compounding: our own copy
    // says "Combine every matching discount", and additive is the only form
    // whose answer does not depend on the order a facility authored them in
    // — the property the custom-fee work deliberately protected.
    const result = quote({
      ...nights,
      rules: rules({ ...twoRules, discountStacking: "apply_all_sequence" }),
    });
    expect(result.discountTotal).toBe(25);
  });

  test("`best_only` keeps the larger of the two rules", () => {
    const result = quote({
      ...nights,
      rules: rules({ ...twoRules, discountStacking: "best_only" }),
    });
    expect(result.discountTotal).toBe(20); // the multi-pet one
  });

  test("a DISCOUNT-KIND CUSTOM FEE is not a competing rule, and survives `best_only`", () => {
    // ── THE F1 REGRESSION ───────────────────────────────────────────────
    //
    // `best_only` filters on `amount < 0`, so it treats EVERY negative
    // adjustment as a rival discount rule and keeps only the largest. A
    // custom fee authored with `adjustmentKind: "discount"` is negative and
    // is not a discount RULE at all — it is a facility's own line, chosen
    // deliberately, and MoéGo's setting is scoped to the two rules on its
    // own page.
    //
    // A facility with a $20 multi-pet discount and a $10 "loyalty" custom
    // fee gets $20 today. Both should apply: $30.
    const result = quote({
      rules: rules({
        discountStacking: "best_only",
        multiPetDiscounts: [
          multiPet({ tiers: [{ petCount: 2, discountAmount: 10 }] }),
        ],
        customFees: [
          {
            id: "cf-loyalty",
            name: "Loyalty credit",
            amount: 10,
            feeType: "flat",
            adjustmentKind: "discount",
            scope: "per_booking",
            autoApply: "at_checkout",
            applicableServices: ["all"],
            isActive: true,
          },
        ],
      }),
    });

    expect(
      result.discountTotal,
      "the custom-fee discount must not be eaten by the rule-stacking mode",
    ).toBe(30);
  });

  test("a ROOM-TYPE discount survives `best_only` too", () => {
    // Same class of defect, different source. A room that is cheaper is a
    // property of the room, not a promotion competing with a multi-pet rule.
    const result = quote({
      rules: rules({
        discountStacking: "best_only",
        multiPetDiscounts: [
          multiPet({ tiers: [{ petCount: 2, discountAmount: 10 }] }),
        ],
        roomTypeAdjustments: [
          {
            id: "rt-1",
            name: "Shared suite",
            roomTypeIds: ["r1"],
            sameRoomRequired: false,
            adjustmentKind: "discount",
            adjustmentType: "flat",
            amount: 6,
            isActive: true,
          },
        ],
      }),
      roomAssignments: [
        { petId: 1, roomId: "r1", roomTypeId: "r1" },
        { petId: 2, roomId: "r1", roomTypeId: "r1" },
      ],
    });

    expect(result.discountTotal).toBeGreaterThan(20);
  });
});

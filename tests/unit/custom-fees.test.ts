import { describe, expect, test } from "bun:test";

import { applyDynamicPricingRules } from "@/lib/pricing-rules";
import { pricingRulesSchema } from "@/lib/settings/pricing";
import type { CustomFee } from "@/types/boarding";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// A custom fee had a 19-field schema, a complete editor, and six working
// trigger modes — and three of its stored fields decided the wrong thing or
// nothing at all. Each test below names one and fails against the code that
// shipped before 2026-09-22.
//
// The last one is different in kind: it pins that a stored blob carrying the
// now-deleted `taxRate` still PARSES. `settingsFromRows` drops a whole domain
// whose value stops parsing, so a schema change that rejected old data would
// delete a facility's pricing rules on deploy rather than ignore one key.

function fee(overrides: Partial<CustomFee> = {}): CustomFee {
  return {
    id: "cf-1",
    name: "Cleaning fee",
    amount: 10,
    feeType: "flat",
    scope: "per_booking",
    autoApply: "at_checkout",
    applicableServices: ["all"],
    isActive: true,
    ...overrides,
  };
}

function quote(fees: CustomFee[], overrides: Record<string, unknown> = {}) {
  return applyDynamicPricingRules({
    rules: {
      discountStacking: "best_only",
      multiPetDiscounts: [],
      latePickupFees: [],
      exceed24Hour: {
        id: "exceed-24h",
        enabled: false,
        amount: 0,
        scope: "per_pet",
      },
      customFees: fees,
      multiNightDiscounts: [],
      peakDateSurcharges: [],
      roomTypeAdjustments: [],
      groomingConditionAdjustments: [],
      serviceBundles: [],
    },
    serviceId: "boarding",
    basePrice: 200,
    existingExtraServices: [],
    selectedPetIds: [1],
    pets: [{ id: 1 }],
    addOnsCatalog: [],
    ...overrides,
  });
}

function customFeeLines(result: ReturnType<typeof quote>) {
  return result.adjustments.filter((a) => a.source === "custom_fee");
}

describe("a percentage fee has a ceiling", () => {
  test("uncapped, it is the whole percentage", () => {
    const lines = customFeeLines(
      quote([fee({ feeType: "percentage", amount: 10 })]),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(20); // 10% of 200
  });

  test("capped, it stops at the cap", () => {
    // THE DEFECT: there was no maxFee, so 10% of a three-week stay had
    // nothing stopping it.
    const lines = customFeeLines(
      quote([fee({ feeType: "percentage", amount: 10, maxFee: 15 })]),
    );
    expect(lines[0].amount).toBe(15);
  });

  test("the cap binds the whole line, not one pet's share", () => {
    // "Never more than $15" means the line, which is what a facility means.
    const lines = customFeeLines(
      quote([fee({ feeType: "percentage", amount: 10, scope: "per_pet" })], {
        selectedPetIds: [1, 2, 3],
        pets: [{ id: 1 }, { id: 2 }, { id: 3 }],
      }),
    );
    expect(lines[0].amount).toBe(60); // uncapped: 20 x 3

    const capped = customFeeLines(
      quote(
        [
          fee({
            feeType: "percentage",
            amount: 10,
            scope: "per_pet",
            maxFee: 25,
          }),
        ],
        {
          selectedPetIds: [1, 2, 3],
          pets: [{ id: 1 }, { id: 2 }, { id: 3 }],
        },
      ),
    );
    expect(capped[0].amount).toBe(25);
  });

  test("a cap of zero is no cap, not a free fee", () => {
    // `0` is what an emptied input round-trips to in some editors. Treating
    // it as a ceiling would silently stop charging.
    const lines = customFeeLines(
      quote([fee({ feeType: "percentage", amount: 10, maxFee: 0 })]),
    );
    expect(lines[0].amount).toBe(20);
  });
});

describe("two percentage fees do not compound", () => {
  test("the answer does not depend on which order they were authored in", () => {
    const a = fee({ id: "a", feeType: "percentage", amount: 10 });
    const b = fee({ id: "b", feeType: "percentage", amount: 5 });

    const forwards = customFeeLines(quote([a, b]));
    const backwards = customFeeLines(quote([b, a]));

    // Both read the SERVICE price, never "the total so far".
    expect(forwards.map((l) => l.amount).sort()).toEqual([10, 20]);
    expect(backwards.map((l) => l.amount).sort()).toEqual([10, 20]);
  });
});

describe("scope is honoured on an add-on-triggered fee", () => {
  test("a per-pet fee triggered by an add-on charges per pet", () => {
    // THE DEFECT: the guard was `autoApply !== "addon_purchase"`, which
    // forced multiplier 1 on every add-on-triggered fee. A per-pet fee
    // silently behaved as per-booking.
    const lines = customFeeLines(
      quote(
        [
          fee({
            autoApply: "addon_purchase",
            scope: "per_pet",
            amount: 5,
            triggerAddOnIds: ["bath"],
          }),
        ],
        {
          selectedPetIds: [1, 2],
          pets: [{ id: 1 }, { id: 2 }],
          existingExtraServices: [{ serviceId: "bath", quantity: 1, petId: 1 }],
        },
      ),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(10); // 5 x 2 pets, not 5
  });

  test("a fee that WAIVES add-ons still charges once", () => {
    // Here the amount already derives from real add-on rows, so multiplying
    // by the pet count would count the same add-ons twice.
    const lines = customFeeLines(
      quote(
        [
          fee({
            autoApply: "addon_purchase",
            scope: "per_pet",
            amount: 0,
            triggerAddOnIds: ["bath"],
            waivedAddOnIds: ["bath"],
            waivePercentage: 100,
          }),
        ],
        {
          selectedPetIds: [1, 2],
          pets: [{ id: 1 }, { id: 2 }],
          existingExtraServices: [{ serviceId: "bath", quantity: 1, petId: 1 }],
          addOnsCatalog: [
            {
              id: "bath",
              name: "Bath",
              price: 20,
              isActive: true,
              applicableServices: ["all"],
              category: "spa",
              duration: 30,
              description: "",
            },
          ],
        },
      ),
    );
    expect(lines).toHaveLength(1);
    expect(Math.abs(lines[0].amount)).toBe(20);
  });
});

describe("an adjustment says which rule made it", () => {
  test("a custom fee carries its own id, not the composite react key", () => {
    // Nothing may recover a fee id by parsing `${fee.id}-${fee.autoApply}`.
    const lines = customFeeLines(quote([fee({ id: "cf-cleaning" })]));
    expect(lines[0].feeId).toBe("cf-cleaning");
    expect(lines[0].id).not.toBe("cf-cleaning");
  });

  test("and carries the unit and the count it was multiplied by", () => {
    const lines = customFeeLines(
      quote([fee({ scope: "per_pet", amount: 7 })], {
        selectedPetIds: [1, 2],
        pets: [{ id: 1 }, { id: 2 }],
      }),
    );
    expect(lines[0].unitAmount).toBe(7);
    expect(lines[0].quantity).toBe(2);
    expect(lines[0].amount).toBe(14);
    expect(lines[0].adjustmentKind).toBe("fee");
  });
});

describe("a stored blob written before this change still parses", () => {
  test("a dropped `taxRate` does not take the whole domain with it", () => {
    // `settingsFromRows` DROPS a domain whose value stops parsing. If the
    // schema rejected the old key rather than ignoring it, deploying this
    // would delete every pricing rule a facility had authored.
    const parsed = pricingRulesSchema.safeParse({
      customFees: [{ ...fee(), taxRate: 5 }],
      latePickupFees: [],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.customFees).toHaveLength(1);
    expect("taxRate" in parsed.data.customFees[0]).toBe(false);
  });
});

import { describe, expect, test } from "bun:test";

import { estimateFeeLines } from "@/lib/estimates/fee-lines";
import { applyDynamicPricingRules } from "@/lib/pricing-rules";
import {
  customFeeLines,
  serviceChargesAtTheTill,
  type CustomFeeFacts,
} from "@/lib/pricing/service-charge-lines";
import type { CustomFee } from "@/types/boarding";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// An estimate made in the booking form put the facility's automatic fees into
// one "Fees and adjustments" line, and a booking made from it took that money
// into its own price: no fee line, nothing named on the invoice, and the till
// — which adds an at-checkout fee a bill does not carry — added it again.
// Each fee is now an estimate line naming its rule, in exactly the shape the
// server writes that fee onto a bill; and the till adds nothing to a booking
// whose charges an estimate stated.

const fee = (patch: Partial<CustomFee>): CustomFee => ({
  id: "fee",
  name: "Fee",
  amount: 10,
  feeType: "flat",
  scope: "per_booking",
  autoApply: "at_checkout",
  applicableServices: ["all"],
  isActive: true,
  ...patch,
});

const FEES: CustomFee[] = [
  fee({ id: "cleaning", name: "Cleaning", amount: 15 }),
  fee({ id: "towels", name: "Towels", amount: 3, scope: "per_pet" }),
  // Three pets at $10 would be $30; the facility caps the whole at $25.
  fee({
    id: "capped",
    name: "Night check",
    amount: 10,
    scope: "per_pet",
    maxFee: 25,
  }),
  fee({
    id: "loyalty",
    name: "Loyalty credit",
    amount: 5,
    adjustmentKind: "discount",
  }),
  fee({ id: "admin", name: "Admin", amount: 2, taxable: false }),
  fee({ id: "off", name: "Retired", isActive: false }),
];

const quote = () =>
  applyDynamicPricingRules({
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
      customFees: FEES,
      multiNightDiscounts: [],
      peakDateSurcharges: [],
      roomTypeAdjustments: [],
      groomingConditionAdjustments: [],
      serviceBundles: [],
    },
    serviceId: "daycare",
    basePrice: 120,
    existingExtraServices: [],
    selectedPetIds: [1, 2, 3],
    pets: [{ id: 1 }, { id: 2 }, { id: 3 }],
    addOnsCatalog: [],
    isNewCustomer: false,
    newPetIds: [],
    customer: { status: "active" },
  });

const facts: CustomFeeFacts = {
  serviceId: "daycare",
  petCount: 3,
  serviceTotal: 120,
  isNewCustomer: false,
  newPetCount: 0,
  customer: { status: "active" },
  extraServices: [],
  addOnPrice: () => undefined,
};

describe("an estimate's fees, from the booking form", () => {
  test("one line per fee the pricing applied, as the server writes it", () => {
    const lines = estimateFeeLines({
      adjustments: quote().adjustments,
      fees: FEES,
    });

    expect(lines).toEqual([
      { label: "Cleaning", amount: 15, quantity: 1, feeId: "cleaning" },
      { label: "Towels", amount: 3, quantity: 3, feeId: "towels" },
      // A cap that binds is one line of the capped total.
      { label: "Night check", amount: 25, quantity: 1, feeId: "capped" },
      { label: "Loyalty credit", amount: -5, quantity: 1, feeId: "loyalty" },
      {
        label: "Admin",
        amount: 2,
        quantity: 1,
        taxable: false,
        feeId: "admin",
      },
    ]);

    // The server's lines for the same request, field for field.
    expect(lines).toEqual(
      customFeeLines(FEES, facts).map((line) => ({
        label: line.name,
        amount: line.unitPrice,
        quantity: line.quantity,
        ...(line.taxable ? {} : { taxable: false as const }),
        feeId: line.feeId,
      })),
    );
  });

  test("a fee the facility has since deleted, and anything not a fee, are not fee lines", () => {
    const lines = estimateFeeLines({
      adjustments: [
        { id: "peak", label: "Peak date", amount: 20, source: "peak_date" },
        {
          id: "gone-at_checkout",
          label: "Gone",
          amount: 9,
          source: "custom_fee",
          feeId: "gone",
          unitAmount: 9,
          quantity: 1,
          adjustmentKind: "fee",
        },
      ],
      fees: FEES,
    });
    expect(lines).toEqual([]);
  });
});

describe("the till", () => {
  const context = {
    serviceId: "daycare",
    petCount: 3,
    serviceTotal: 120,
  };

  test("adds the at-checkout fees a bill does not carry yet", () => {
    const lines = serviceChargesAtTheTill({
      fees: FEES,
      context,
      chargesStated: false,
      alreadyCharged: new Set(["cleaning"]),
    });
    expect(lines.map((line) => line.feeId)).toEqual([
      "towels",
      "capped",
      "loyalty",
      "admin",
    ]);
  });

  test("adds nothing to a booking whose charges an estimate stated", () => {
    expect(
      serviceChargesAtTheTill({
        fees: FEES,
        context,
        chargesStated: true,
        alreadyCharged: new Set(),
      }),
    ).toEqual([]);
  });
});

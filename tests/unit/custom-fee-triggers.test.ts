import { describe, expect, test } from "bun:test";

import { applyDynamicPricingRules } from "@/lib/pricing-rules";
import {
  customFeeApplies,
  customFeeCharge,
  customFeeLines,
  type CustomFeeFacts,
} from "@/lib/pricing/service-charge-lines";
import {
  customerFacts,
  requestFeeFacts,
} from "@/lib/pricing/request-fee-facts";
import type { BookableAddOn } from "@/lib/add-ons/bookable";
import type { CustomFee } from "@/types/boarding";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// A custom fee the booking form quotes is taken out of `total_cost`, because
// a fee is a line on the bill. Until 2026-09-30 the server wrote lines for the
// two triggers it could decide (at checkout, by care type), and a fee for a
// new customer, a new pet, a customer segment or an add-on bought was quoted
// and never charged. The server now decides every trigger with the same
// functions the form's engine uses, from the same facts read from the
// database. These pin the triggers, the money, and — the point — that the
// engine's quote and the server's lines come to the same figure.

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

const WALK = "addon-walk";
const BATH = "addon-bath";
const PRICES: Record<string, number> = { [WALK]: 8, [BATH]: 25 };

const facts = (patch: Partial<CustomFeeFacts> = {}): CustomFeeFacts => ({
  serviceId: "boarding",
  locationId: null,
  petCount: 2,
  serviceTotal: 200,
  isNewCustomer: false,
  newPetCount: 0,
  customer: { status: "active" },
  extraServices: [],
  addOnPrice: (id) => PRICES[id],
  ...patch,
});

describe("whether a fee applies", () => {
  test("the two service-only triggers, as before", () => {
    expect(customFeeApplies(fee({}), facts())).toBe(true);
    expect(
      customFeeApplies(
        fee({ autoApply: "by_care_type", autoApplyCareTypes: ["daycare"] }),
        facts(),
      ),
    ).toBe(false);
    expect(
      customFeeApplies(
        fee({ autoApply: "by_care_type", autoApplyCareTypes: ["boarding"] }),
        facts(),
      ),
    ).toBe(true);
  });

  test("a new customer's fee, only for a new customer", () => {
    const newCustomer = fee({ autoApply: "new_customer" });
    expect(customFeeApplies(newCustomer, facts({ isNewCustomer: true }))).toBe(
      true,
    );
    expect(customFeeApplies(newCustomer, facts())).toBe(false);
  });

  test("a new pet's fee, only when a pet is new", () => {
    const newPet = fee({ autoApply: "new_pet" });
    expect(customFeeApplies(newPet, facts({ newPetCount: 1 }))).toBe(true);
    expect(customFeeApplies(newPet, facts())).toBe(false);
  });

  test("a segment fee needs a criterion, and every one it names", () => {
    const segment = fee({
      autoApply: "customer_segment",
      customerStatuses: ["VIP"],
      requireMembershipActive: true,
    });
    expect(
      customFeeApplies(
        segment,
        facts({ customer: { status: "vip", membershipStatus: "Active" } }),
      ),
    ).toBe(true);
    expect(
      customFeeApplies(segment, facts({ customer: { status: "vip" } })),
    ).toBe(false);
    // A segment fee with no criterion is nobody's.
    expect(
      customFeeApplies(fee({ autoApply: "customer_segment" }), facts()),
    ).toBe(false);
  });

  test("an add-on's fee when the request carries that add-on", () => {
    const bought = fee({
      autoApply: "addon_purchase",
      triggerAddOnIds: [BATH],
    });
    expect(
      customFeeApplies(
        bought,
        facts({ extraServices: [{ serviceId: BATH, quantity: 1, petId: 1 }] }),
      ),
    ).toBe(true);
    expect(
      customFeeApplies(
        bought,
        facts({ extraServices: [{ serviceId: WALK, quantity: 1, petId: 1 }] }),
      ),
    ).toBe(false);
  });

  test("never one chosen by hand, one switched off, or another service's", () => {
    expect(customFeeApplies(fee({ autoApply: "none" }), facts())).toBe(false);
    expect(customFeeApplies(fee({ isActive: false }), facts())).toBe(false);
    expect(
      customFeeApplies(fee({ applicableServices: ["daycare"] }), facts()),
    ).toBe(false);
  });
});

describe("what it comes to", () => {
  test("per pet, per new pet, or once", () => {
    expect(customFeeCharge(fee({ scope: "per_pet" }), facts())?.total).toBe(20);
    expect(
      customFeeCharge(
        fee({ autoApply: "new_pet", scope: "per_pet" }),
        facts({ newPetCount: 1 }),
      )?.total,
    ).toBe(10);
    expect(customFeeCharge(fee({}), facts())?.total).toBe(10);
  });

  test("a percentage of the service, a branch's own amount, and a cap", () => {
    expect(
      customFeeCharge(fee({ feeType: "percentage", amount: 10 }), facts())
        ?.total,
    ).toBe(20);
    expect(
      customFeeCharge(
        fee({ locationPrices: { branch: 4 } }),
        facts({ locationId: "branch" }),
      )?.total,
    ).toBe(4);
    const capped = customFeeCharge(
      fee({ scope: "per_pet", amount: 15, maxFee: 25 }),
      facts(),
    );
    expect(capped?.total).toBe(25);
    // One capped charge is one line of the whole amount, not 12.50 × 2.
    expect(
      customFeeLines(
        [fee({ scope: "per_pet", amount: 15, maxFee: 25 })],
        facts(),
      ),
    ).toEqual([
      {
        feeId: "fee",
        name: "Fee",
        kind: "fee",
        unitPrice: 25,
        quantity: 1,
        taxable: true,
      },
    ]);
  });

  test("a fee that waives an add-on is a discount of that add-on's price", () => {
    const waiver = fee({
      autoApply: "addon_purchase",
      triggerAddOnIds: [BATH],
      waivedAddOnIds: [BATH],
      waivePercentage: 50,
      scope: "per_pet",
    });
    const lines = customFeeLines(
      [waiver],
      facts({ extraServices: [{ serviceId: BATH, quantity: 2, petId: 1 }] }),
    );
    // Half of two $25 baths, once: the add-on rows are its units, not the pets.
    expect(lines).toEqual([
      {
        feeId: "fee",
        name: "Fee",
        kind: "item",
        unitPrice: -25,
        quantity: 1,
        taxable: true,
      },
    ]);
  });
});

describe("the quote and the bill agree", () => {
  // The same request, told to the engine the way the form tells it and to
  // `customFeeLines` the way the server does. Every trigger at once.
  const fees: CustomFee[] = [
    fee({ id: "checkout", amount: 12 }),
    fee({ id: "new-customer", autoApply: "new_customer", amount: 25 }),
    fee({ id: "new-pet", autoApply: "new_pet", scope: "per_pet", amount: 5 }),
    fee({
      id: "vip",
      autoApply: "customer_segment",
      customerStatuses: ["active"],
      feeType: "percentage",
      amount: 5,
    }),
    fee({
      id: "bath-fee",
      autoApply: "addon_purchase",
      triggerAddOnIds: [BATH],
      amount: 3,
      scope: "per_pet",
    }),
    fee({
      id: "walk-waiver",
      autoApply: "addon_purchase",
      triggerAddOnIds: [WALK],
      waivedAddOnIds: [WALK],
    }),
  ];
  const extraServices = [
    { serviceId: BATH, quantity: 1, petId: 1 },
    { serviceId: WALK, quantity: 3, petId: 2 },
  ];
  const catalogue: BookableAddOn[] = [
    {
      ref: BATH,
      rowId: "11111111-1111-4111-8111-111111111111",
      name: "Bath",
      description: "",
      imageUrl: null,
      category: null,
      isActive: true,
      requiresStaff: false,
      price: 25,
      taxable: true,
      durationMin: 0,
    },
    {
      ref: WALK,
      rowId: "22222222-2222-4222-8222-222222222222",
      name: "Walk",
      description: "",
      imageUrl: null,
      category: null,
      isActive: true,
      requiresStaff: false,
      price: 8,
      taxable: true,
      durationMin: 0,
    },
  ];

  test("every trigger, the engine's fees and the server's lines", () => {
    const quote = applyDynamicPricingRules({
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
      existingExtraServices: extraServices,
      selectedPetIds: [1, 2],
      pets: [{ id: 1 }, { id: 2 }],
      addOnsCatalog: catalogue,
      isNewCustomer: true,
      newPetIds: [2],
      customer: { status: "active" },
    });
    const quoted = quote.adjustments.filter((a) => a.source === "custom_fee");

    const lines = customFeeLines(
      fees,
      facts({
        serviceTotal: 200 + quote.addOnsTotal,
        isNewCustomer: true,
        newPetCount: 1,
        extraServices,
      }),
    );

    expect(lines.map((l) => l.feeId)).toEqual(quoted.map((a) => a.feeId ?? ""));
    for (const line of lines) {
      const adjustment = quoted.find((a) => a.feeId === line.feeId)!;
      expect(line.unitPrice * line.quantity).toBeCloseTo(adjustment.amount, 2);
    }
    // $12 + $25 new customer + $5 one new pet + 5% of ($200 + $49 add-ons)
    // + $3 × 2 pets for the bath − three $8 walks waived.
    expect(
      lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    ).toBeCloseTo(12 + 25 + 5 + 12.45 + 6 - 24, 2);
  });
});

describe("the facts, from a request's rows", () => {
  test("the whole request: its service before the rules, its pets, what is new", () => {
    const facts = requestFeeFacts({
      parts: [
        {
          service: "daycare",
          base_price: 40,
          total_cost: 45,
          add_ons_total: 10,
          location_id: "branch",
        },
        {
          service: "daycare",
          base_price: 40,
          total_cost: 45,
          add_ons_total: 0,
          location_id: "branch",
        },
        // A row from before `base_price` was filled counts its price.
        {
          service: "daycare",
          base_price: 0,
          total_cost: "38.50",
          add_ons_total: null,
          location_id: "branch",
        },
      ],
      petIds: ["a", "b"],
      earlierPetIds: new Set(["a"]),
      hadEarlierBooking: true,
      client: { status: "active", details: {} },
      extraServices: [{ serviceId: WALK, quantity: 2, petId: 7 }, "not a line"],
      addOnPrice: () => undefined,
    });
    expect(facts).toMatchObject({
      serviceId: "daycare",
      locationId: "branch",
      petCount: 2,
      serviceTotal: 40 + 10 + 40 + 38.5,
      isNewCustomer: false,
      newPetCount: 1,
      extraServices: [{ serviceId: WALK, quantity: 2, petId: 7 }],
    });
  });

  test("a client's segment, from the record the form reads it from", () => {
    expect(
      customerFacts({
        status: "vip",
        details: {
          membership: { plan: "Gold", status: "active" },
          storeCredit: { balance: 12 },
          packages: [{ remainingCredits: 0 }, { remainingCredits: 3 }],
        },
      }),
    ).toEqual({
      status: "vip",
      membershipPlan: "Gold",
      membershipStatus: "active",
      storeCreditBalance: 12,
      hasPackageCredits: true,
    });
    expect(customerFacts({ status: null, details: "junk" })).toEqual({
      status: undefined,
      membershipPlan: undefined,
      membershipStatus: undefined,
      storeCreditBalance: undefined,
      hasPackageCredits: false,
    });
  });
});

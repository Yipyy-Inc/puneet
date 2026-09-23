import { describe, expect, test } from "bun:test";

import {
  applicableServiceCharges,
  automaticServiceCharges,
  feeAmountAt,
  manualServiceCharges,
  serviceChargeLine,
  serviceChargeLines,
  serviceChargesTotal,
} from "@/lib/pricing/service-charge-lines";
import type { CustomFee } from "@/types/boarding";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// This module turns a chosen fee into money, and three places call it — the
// booking form's preview, the server's create path, and the till. The tests
// that matter are the ones where a wrong answer becomes a wrong bill:
// rounding, the percentage base, the discount direction, and the fees that
// must NOT be applied automatically.

function fee(overrides: Partial<CustomFee> = {}): CustomFee {
  return {
    id: "cf-1",
    name: "Cleaning fee",
    amount: 15,
    feeType: "flat",
    scope: "per_booking",
    autoApply: "at_checkout",
    applicableServices: ["all"],
    isActive: true,
    ...overrides,
  };
}

const ctx = { serviceId: "boarding", petCount: 1, serviceTotal: 200 };

describe("which fees apply without asking anything about the customer", () => {
  test("`at_checkout` and `by_care_type` do; the richer triggers do not", () => {
    const fees = [
      fee({ id: "always", autoApply: "at_checkout" }),
      fee({
        id: "by-care",
        autoApply: "by_care_type",
        autoApplyCareTypes: ["boarding"],
      }),
      fee({ id: "new-cust", autoApply: "new_customer" }),
      fee({ id: "segment", autoApply: "customer_segment" }),
      fee({ id: "addon", autoApply: "addon_purchase" }),
      fee({ id: "manual", autoApply: "none" }),
    ];
    expect(automaticServiceCharges(fees, "boarding").map((f) => f.id)).toEqual([
      "always",
      "by-care",
    ]);
  });

  test("a care-type fee for another service does not", () => {
    const fees = [
      fee({
        id: "daycare-only",
        autoApply: "by_care_type",
        autoApplyCareTypes: ["daycare"],
      }),
    ];
    expect(automaticServiceCharges(fees, "boarding")).toEqual([]);
  });

  test("a fee narrowed to another branch does not apply at this one", () => {
    const fees = [
      fee({ id: "downtown", applicableLocationIds: ["loc-downtown"] }),
      fee({ id: "everywhere" }),
    ];
    expect(
      automaticServiceCharges(fees, "boarding", "loc-suburb").map((f) => f.id),
    ).toEqual(["everywhere"]);
    expect(
      automaticServiceCharges(fees, "boarding", "loc-downtown").map(
        (f) => f.id,
      ),
    ).toEqual(["downtown", "everywhere"]);
  });

  test("a booking with NO branch still gets a narrowed fee", () => {
    // Every single-location facility, and any row that predates branches.
    // Silently dropping a charge because a row has no branch on it is the
    // failure that costs money; narrowing is something somebody chooses.
    const fees = [fee({ id: "downtown", applicableLocationIds: ["loc-a"] })];
    expect(automaticServiceCharges(fees, "boarding").map((f) => f.id)).toEqual([
      "downtown",
    ]);
    expect(
      automaticServiceCharges(fees, "boarding", null).map((f) => f.id),
    ).toEqual(["downtown"]);
  });

  test("an EMPTY branch list means every branch, not none", () => {
    const fees = [fee({ id: "open", applicableLocationIds: [] })];
    expect(
      automaticServiceCharges(fees, "boarding", "loc-anything").map(
        (f) => f.id,
      ),
    ).toEqual(["open"]);
  });

  test("the branch narrows the picker and the manual list too", () => {
    const fees = [
      fee({ id: "manual-here", autoApply: "none" }),
      fee({
        id: "manual-there",
        autoApply: "none",
        applicableLocationIds: ["loc-other"],
      }),
    ];
    expect(
      manualServiceCharges(fees, "boarding", "loc-here").map((f) => f.id),
    ).toEqual(["manual-here"]);
    expect(
      applicableServiceCharges(fees, "boarding", "loc-here").map((f) => f.id),
    ).toEqual(["manual-here"]);
  });

  test("an inactive fee never does", () => {
    expect(
      automaticServiceCharges([fee({ isActive: false })], "boarding"),
    ).toEqual([]);
  });

  test("manual fees are their own list, and only the manual ones", () => {
    const fees = [
      fee({ id: "manual", autoApply: "none" }),
      fee({ id: "always", autoApply: "at_checkout" }),
    ];
    expect(manualServiceCharges(fees, "boarding").map((f) => f.id)).toEqual([
      "manual",
    ]);
  });

  test("the picker is offered every active fee for the service, automatic ones included", () => {
    // Wider than `manualServiceCharges` on purpose: the dialog shows the
    // facility's whole list and marks what the booking already carries, so an
    // automatic fee must appear rather than seem to have vanished.
    const fees = [
      fee({ id: "auto", autoApply: "at_checkout" }),
      fee({ id: "manual", autoApply: "none" }),
      fee({ id: "segment", autoApply: "customer_segment" }),
      fee({ id: "off", isActive: false }),
      fee({ id: "other-service", applicableServices: ["grooming"] }),
    ];
    expect(applicableServiceCharges(fees, "boarding").map((f) => f.id)).toEqual(
      ["auto", "manual", "segment"],
    );
  });

  test("a manual fee scoped to another service is not offered", () => {
    const fees = [
      fee({
        id: "grooming-only",
        autoApply: "none",
        applicableServices: ["grooming"],
      }),
    ];
    expect(manualServiceCharges(fees, "boarding")).toEqual([]);
  });
});

describe("what a fee costs at a particular branch", () => {
  test("a branch with its own price charges that price", () => {
    const line = serviceChargeLine(
      fee({ amount: 15, locationPrices: { "loc-downtown": 25 } }),
      { ...ctx, locationId: "loc-downtown" },
    )!;
    expect(line.unitPrice).toBe(25);
  });

  test("a branch with no entry charges the usual price", () => {
    // Adding a location must never silently make every fee free there.
    const line = serviceChargeLine(
      fee({ amount: 15, locationPrices: { "loc-downtown": 25 } }),
      { ...ctx, locationId: "loc-suburb" },
    )!;
    expect(line.unitPrice).toBe(15);
  });

  test("a booking with no branch charges the usual price", () => {
    // Every single-location facility, and every row older than branches.
    const priced = fee({ amount: 15, locationPrices: { "loc-a": 25 } });
    expect(serviceChargeLine(priced, ctx)!.unitPrice).toBe(15);
    expect(
      serviceChargeLine(priced, { ...ctx, locationId: null })!.unitPrice,
    ).toBe(15);
  });

  test("a branch price of ZERO is an override, and drops the line", () => {
    // "This branch does not charge for that" is a real thing to mean, and it
    // is the one case where an override and an absent entry must NOT agree.
    expect(
      serviceChargeLine(fee({ amount: 15, locationPrices: { "loc-a": 0 } }), {
        ...ctx,
        locationId: "loc-a",
      }),
    ).toBeNull();
  });

  test("a corrupted entry falls back rather than charging nonsense", () => {
    const broken = fee({
      amount: 15,
      locationPrices: { "loc-a": Number.NaN, "loc-b": -5 },
    });
    expect(
      serviceChargeLine(broken, { ...ctx, locationId: "loc-a" })!.unitPrice,
    ).toBe(15);
    expect(
      serviceChargeLine(broken, { ...ctx, locationId: "loc-b" })!.unitPrice,
    ).toBe(15);
  });

  test("a PERCENTAGE override is a percentage, not money", () => {
    // 20% of 200 at this branch, against 10% everywhere else.
    const line = serviceChargeLine(
      fee({
        feeType: "percentage",
        amount: 10,
        locationPrices: { "loc-a": 20 },
      }),
      { ...ctx, locationId: "loc-a" },
    )!;
    expect(line.unitPrice).toBe(40);
  });

  test("the branch price is what per-pet multiplies and the cap binds", () => {
    const line = serviceChargeLine(
      fee({
        amount: 15,
        scope: "per_pet",
        locationPrices: { "loc-a": 30 },
        maxFee: 50,
      }),
      { ...ctx, petCount: 3, locationId: "loc-a" },
    )!;
    // 30 x 3 = 90, capped at 50, so one charge of 50.
    expect(line.quantity).toBe(1);
    expect(line.unitPrice).toBe(50);
  });

  test("feeAmountAt answers the question on its own", () => {
    const priced = fee({ amount: 15, locationPrices: { "loc-a": 25 } });
    expect(feeAmountAt(priced, "loc-a")).toBe(25);
    expect(feeAmountAt(priced, "loc-b")).toBe(15);
    expect(feeAmountAt(priced, null)).toBe(15);
    expect(feeAmountAt(fee({ amount: 15 }), "loc-a")).toBe(15);
  });
});

describe("what one fee costs", () => {
  test("a flat fee, once per booking", () => {
    expect(serviceChargeLine(fee(), ctx)).toEqual({
      feeId: "cf-1",
      name: "Cleaning fee",
      kind: "fee",
      unitPrice: 15,
      quantity: 1,
      taxable: true,
    });
  });

  test("a flat fee, per pet", () => {
    const line = serviceChargeLine(fee({ scope: "per_pet" }), {
      ...ctx,
      petCount: 3,
    })!;
    expect(line.unitPrice).toBe(15);
    expect(line.quantity).toBe(3);
    expect(serviceChargesTotal([line])).toBe(45);
  });

  test("a percentage is a percentage of the SERVICE, not of the total so far", () => {
    const line = serviceChargeLine(
      fee({ feeType: "percentage", amount: 10 }),
      ctx,
    )!;
    expect(line.unitPrice).toBe(20);
  });

  test("the cap binds the whole line, as ONE charge", () => {
    // 10% of 200 is 20, x3 pets is 60, capped at 25. Expressed as three units
    // that is 8.3333 each, which rounds to 8.33 and totals 24.99 — because
    // the line's price is GENERATED as unit_price x quantity in the database.
    // The facility set a cap of 25 and would have charged 24.99, forever.
    //
    // A capped fee is one charge of the cap.
    const line = serviceChargeLine(
      fee({ feeType: "percentage", amount: 10, scope: "per_pet", maxFee: 25 }),
      { ...ctx, petCount: 3 },
    )!;
    expect(line.quantity).toBe(1);
    expect(line.unitPrice).toBe(25);
    expect(serviceChargesTotal([line])).toBe(25);
  });

  test("a cap that does NOT bind leaves the per-pet shape alone", () => {
    // The invoice should still read "x3" when the cap was never reached.
    const line = serviceChargeLine(
      fee({ scope: "per_pet", amount: 15, maxFee: 100 }),
      { ...ctx, petCount: 3 },
    )!;
    expect(line.quantity).toBe(3);
    expect(line.unitPrice).toBe(15);
    expect(serviceChargesTotal([line])).toBe(45);
  });

  test("a fee that comes to nothing is not a line", () => {
    // A percentage of a zero-priced request — every customer-inserted booking
    // is zeroed by the integrity trigger until staff price it.
    expect(
      serviceChargeLine(fee({ feeType: "percentage", amount: 10 }), {
        ...ctx,
        serviceTotal: 0,
      }),
    ).toBeNull();
    expect(serviceChargeLine(fee({ amount: 0 }), ctx)).toBeNull();
  });

  test("a discount is a negative ITEM, never a negative fee", () => {
    // `print-invoice.ts` groups fees into their own block, where a negative
    // reads as a mistake.
    const line = serviceChargeLine(
      fee({ adjustmentKind: "discount", amount: 10 }),
      ctx,
    )!;
    expect(line.kind).toBe("item");
    expect(line.unitPrice).toBe(-10);
    expect(serviceChargesTotal([line])).toBe(-10);
  });

  test("a per-pet amount that does not divide evenly still totals correctly", () => {
    // 10% of 100 over 3 pets is 3.3333 each. The LINE must come to the right
    // money; `price` is generated as unit_price x quantity in the database,
    // so a unit rounded badly is a bill that is wrong by cents forever.
    const line = serviceChargeLine(
      fee({ feeType: "percentage", amount: 10, scope: "per_pet" }),
      { serviceId: "boarding", petCount: 3, serviceTotal: 100 },
    )!;
    expect(line.quantity).toBe(3);
    expect(line.unitPrice).toBe(10);
    expect(serviceChargesTotal([line])).toBe(30);
  });
});

describe("the lines for a whole booking", () => {
  test("two automatic fees make two lines, and the total is their sum", () => {
    const lines = serviceChargeLines(
      [
        fee({ id: "clean", amount: 15 }),
        fee({ id: "travel", amount: 12 }),
        fee({ id: "manual", autoApply: "none", amount: 99 }),
      ],
      ctx,
    );
    expect(lines.map((l) => l.feeId)).toEqual(["clean", "travel"]);
    expect(serviceChargesTotal(lines)).toBe(27);
  });

  test("no fees means no lines, never a default line", () => {
    expect(serviceChargeLines([], ctx)).toEqual([]);
    expect(serviceChargeLines(undefined, ctx)).toEqual([]);
    expect(serviceChargesTotal([])).toBe(0);
  });
});

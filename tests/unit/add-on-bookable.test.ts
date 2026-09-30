import { describe, expect, test } from "bun:test";

import { addOnsForCareType } from "@/lib/add-ons/availability";
import {
  addOnRef,
  bookableAt,
  bookableLookup,
  namesAddOn,
} from "@/lib/add-ons/bookable";
import { computeAddOnsTotal } from "@/lib/pricing/add-on-lines";
import { applyDynamicPricingRules } from "@/lib/pricing-rules";
import type { ServiceBundleRule } from "@/types/boarding";
import type { AddOn } from "@/types/add-on";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// The two things a booking reads of an add-on that the row's own fields
// answer wrongly: what it is NAMED BY, and what it COSTS HERE.
//
// Every add-on that came from the old lists carries the id it had there, and
// every booking, default and pricing rule written since names it by that. A
// screen that compares the row's uuid with one of those finds nothing, prices
// nothing and says nothing — and an end-to-end fixture that seeds an add-on
// with no old id passes anyway. So the old-id path is pinned here, where it
// costs nothing to run.

const NAIL_ROW = "11111111-1111-4111-8111-111111111111";
const WALK_ROW = "22222222-2222-4222-8222-222222222222";
const BRANCH = "33333333-3333-4333-8333-333333333333";

const row = (patch: Partial<AddOn> = {}): AddOn => ({
  id: NAIL_ROW,
  legacyId: "addon-1789",
  categoryId: "cat-groom",
  name: "Nail trim",
  description: "Clip and file",
  isActive: true,
  imageUrl: null,
  colorCode: null,
  locationIds: [],
  price: 15,
  taxable: true,
  durationMin: 10,
  requiresStaff: true,
  appliesToAllServices: true,
  serviceRefs: [],
  eligibleSpecies: [],
  eligibleBreeds: [],
  eligibleWeightTiers: [],
  eligibleCoatTypes: [],
  displayOrder: 1,
  overrides: [],
  createdAt: "2026-09-26T00:00:00Z",
  updatedAt: "2026-09-26T00:00:00Z",
  ...patch,
});

const walk = row({
  id: WALK_ROW,
  legacyId: null,
  categoryId: null,
  name: "Daily walk",
  price: 8,
  requiresStaff: false,
});

describe("what a record names an add-on by", () => {
  test("the id it had before the one list, else its row's uuid", () => {
    expect(addOnRef(row())).toBe("addon-1789");
    expect(addOnRef(walk)).toBe(WALK_ROW);
  });

  test("a stored id names it by either, and by nothing else", () => {
    expect(namesAddOn("addon-1789", row())).toBe(true);
    expect(namesAddOn(NAIL_ROW, row())).toBe(true);
    expect(namesAddOn(WALK_ROW, row())).toBe(false);
    // No old id is not an id that matches an empty one.
    expect(namesAddOn("", walk)).toBe(false);
  });
});

describe("the add-on as a booking reads it", () => {
  test("carries both names, and its category's name", () => {
    const bookable = bookableAt(row(), null, [
      { id: "cat-groom", name: "Grooming & hygiene", displayOrder: 1 },
    ]);
    expect(bookable).toMatchObject({
      ref: "addon-1789",
      rowId: NAIL_ROW,
      name: "Nail trim",
      category: "Grooming & hygiene",
      requiresStaff: true,
      price: 15,
      taxable: true,
      durationMin: 10,
    });
    expect(bookableAt(walk).category).toBeNull();
  });

  test("is priced, taxed and timed by the booking's location", () => {
    const overridden = row({
      overrides: [
        { locationId: BRANCH, price: 22, taxable: false, durationMin: null },
      ],
    });
    expect(bookableAt(overridden, BRANCH)).toMatchObject({
      price: 22,
      taxable: false,
      // Null is "the add-on's own".
      durationMin: 10,
    });
    expect(bookableAt(overridden, null).price).toBe(15);
  });

  test("is found by either name", () => {
    const lookup = bookableLookup([bookableAt(row()), bookableAt(walk)]);
    expect(lookup.get("addon-1789")?.name).toBe("Nail trim");
    expect(lookup.get(NAIL_ROW)?.name).toBe("Nail trim");
    expect(lookup.get(WALK_ROW)?.name).toBe("Daily walk");
    expect(lookup.get("nail-trim")).toBeUndefined();
  });
});

describe("pricing a booking's lines", () => {
  const catalogue = [bookableAt(row()), bookableAt(walk)];

  test("a line is priced whichever way it names its add-on", () => {
    expect(
      computeAddOnsTotal(
        [
          { serviceId: "addon-1789", quantity: 2, petId: 1 },
          { serviceId: NAIL_ROW, quantity: 1, petId: 2 },
          { serviceId: WALK_ROW, quantity: 3, petId: 1 },
        ],
        bookableLookup(catalogue),
      ),
    ).toBe(2 * 15 + 15 + 3 * 8);
  });

  const bundle: ServiceBundleRule = {
    id: "bundle-1",
    name: "Departure trim",
    triggerService: "boarding",
    bundledService: "grooming",
    bundledServiceLabel: "Nail trim",
    triggerUnit: "nights",
    minUnits: 1,
    requireSamePet: false,
    requireSameRoom: false,
    bundleMode: "mandatory",
    pricingMode: "included",
    isActive: true,
  };

  // The engine adds a mandatory bundle's add-on to the booking itself. Under
  // the row's uuid it would be a second line beside the same add-on chosen by
  // hand, and the server would price the pair.
  test("a bundle writes its add-on's line under the ref, and takes its price off", () => {
    const result = applyDynamicPricingRules({
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
        customFees: [],
        multiNightDiscounts: [],
        peakDateSurcharges: [],
        roomTypeAdjustments: [],
        groomingConditionAdjustments: [],
        serviceBundles: [bundle],
      },
      serviceId: "boarding",
      basePrice: 200,
      boardingNights: 3,
      existingExtraServices: [],
      selectedPetIds: [1],
      pets: [{ id: 1 }],
      addOnsCatalog: catalogue,
    });
    expect(result.extraServices).toEqual([
      { serviceId: "addon-1789", quantity: 1, petId: 1 },
    ]);
    expect(result.addOnsTotal).toBe(15);
    expect(result.total).toBe(200);
  });
});

describe("the live add-ons for one type of service", () => {
  const names = (addOns: AddOn[], careType: string) =>
    addOnsForCareType(addOns, careType).map((a) => a.name);

  test("all services is every type, a custom module's included", () => {
    expect(names([row()], "boarding")).toEqual(["Nail trim"]);
    expect(names([row()], "pet-taxi")).toEqual(["Nail trim"]);
  });

  test("chosen services are their types, and a module its slug", () => {
    const chosen = row({
      appliesToAllServices: false,
      serviceRefs: [
        "boarding:44444444-4444-4444-8444-444444444444",
        "training",
        "custom:pet-taxi",
      ],
    });
    expect(names([chosen], "boarding")).toEqual(["Nail trim"]);
    expect(names([chosen], "training")).toEqual(["Nail trim"]);
    expect(names([chosen], "pet-taxi")).toEqual(["Nail trim"]);
    expect(names([chosen], "daycare")).toEqual([]);
  });

  // The JSON read "no services named" as EVERY service, and the screens that
  // counted add-ons went on doing so after the booking screens stopped.
  test("no services chosen is no services", () => {
    expect(names([row({ appliesToAllServices: false })], "boarding")).toEqual(
      [],
    );
  });

  test("an inactive add-on is not live", () => {
    expect(names([row({ isActive: false })], "boarding")).toEqual([]);
  });
});

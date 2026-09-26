import { describe, expect, test } from "bun:test";

import {
  legacyApplicableServices,
  toLegacyAddOnCategory,
  toLegacyServiceAddOn,
} from "../../src/lib/add-ons/legacy-shape";
import type { AddOn } from "../../src/types/add-on";

// ============================================================================
// The one add-ons list, in the shape the booking screens still read.
//
// Every booking picker, the confirm step and the server re-price read add-ons
// through this conversion (useServiceAddOns, price-booking's liveAddOns), so a
// mistake here reaches every booking at once — the id they key on, the price
// they add, and whether a picker shows the add-on at all.
// ============================================================================

const base: AddOn = {
  id: "11111111-1111-4111-8111-111111111111",
  legacyId: null,
  categoryId: null,
  name: "Nail trim",
  description: "",
  isActive: true,
  imageUrl: null,
  colorCode: null,
  locationIds: [],
  price: 15,
  taxable: true,
  durationMin: 10,
  requiresStaff: false,
  appliesToAllServices: true,
  serviceRefs: [],
  eligibleSpecies: [],
  eligibleBreeds: [],
  eligibleWeightTiers: [],
  eligibleCoatTypes: [],
  displayOrder: 3,
  overrides: [],
  createdAt: "2026-09-26T00:00:00Z",
  updatedAt: "2026-09-26T00:00:00Z",
};

describe("toLegacyServiceAddOn", () => {
  test("keys on the legacy id when there is one, so old bookings still resolve", () => {
    expect(toLegacyServiceAddOn(base, []).id).toBe(base.id);
    expect(
      toLegacyServiceAddOn({ ...base, legacyId: "addon-1789" }, []).id,
    ).toBe("addon-1789");
  });

  test("one price, and the booking says how many", () => {
    const legacy = toLegacyServiceAddOn(base, []);
    expect(legacy.pricingType).toBe("per_item");
    expect(legacy.price).toBe(15);
    expect(legacy.petScope).toBe("per_pet");
    expect(legacy.isDefault).toBeUndefined();
    expect(legacy.isRequired).toBeUndefined();
  });

  test("names its category by the category's name", () => {
    const legacy = toLegacyServiceAddOn({ ...base, categoryId: "cat-1" }, [
      { id: "cat-1", name: "Treats", displayOrder: 1 },
    ]);
    expect(legacy.category).toBe("Treats");
  });

  test("carries no pet filter when the add-on is for every pet", () => {
    expect(toLegacyServiceAddOn(base, []).petTypeFilter).toBeUndefined();
  });

  test("turns size tiers back into the pound range the pickers compare", () => {
    const small = toLegacyServiceAddOn(
      { ...base, eligibleWeightTiers: ["small", "medium"] },
      [],
    ).petTypeFilter;
    expect(small).toEqual({ weightMax: 35 });

    const big = toLegacyServiceAddOn(
      { ...base, eligibleWeightTiers: ["large", "giant"] },
      [],
    ).petTypeFilter;
    expect(big).toEqual({ weightMin: 35 });
  });
});

describe("legacyApplicableServices", () => {
  test("all services still passes a raw includes() for every built-in type", () => {
    const services = legacyApplicableServices(base);
    for (const service of ["boarding", "daycare", "grooming", "training"]) {
      expect(services).toContain(service);
    }
    expect(services).toContain("all");
  });

  test("chosen services become their care types, and a module its slug", () => {
    expect(
      legacyApplicableServices({
        ...base,
        appliesToAllServices: false,
        serviceRefs: [
          "boarding:22222222-2222-4222-8222-222222222222",
          "boarding:33333333-3333-4333-8333-333333333333",
          "daycare:44444444-4444-4444-8444-444444444444",
          "custom:pet-taxi",
        ],
      }).sort(),
    ).toEqual(["boarding", "daycare", "pet-taxi"]);
  });

  test("no services chosen is no services", () => {
    expect(
      legacyApplicableServices({ ...base, appliesToAllServices: false }),
    ).toEqual([]);
  });
});

test("a category keeps its order", () => {
  expect(
    toLegacyAddOnCategory({ id: "c", name: "Treats", displayOrder: 4 }),
  ).toMatchObject({ id: "c", name: "Treats", sortOrder: 4 });
});

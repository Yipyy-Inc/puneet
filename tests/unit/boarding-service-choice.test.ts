import { describe, expect, test } from "bun:test";

import type { BoardingService } from "@/lib/api/mappers/boarding-service";
import {
  boardingPetFactsFor,
  boardingWeightTierFor,
  eligibleBoardingServices,
  isBoardingServiceOfferedAt,
  isPetEligibleForBoarding,
  lodgingTypesServing,
  resolveBoardingService,
  servesLodgingType,
  stayUnits,
} from "@/lib/pricing/boarding-service-choice";

// ============================================================================
// The boarding menu's pure logic.
//
// Everything here is string and number arithmetic with no browser and no
// database — the shape `tests/unit/` exists for. What it is actually guarding
// is money: `stayUnits` is the only place a date range becomes a quantity, and
// `resolveBoardingService` is the only place four callers agree on a row.
// ============================================================================

function service(over: Partial<BoardingService> = {}): BoardingService {
  return {
    id: "svc-suite",
    rowId: "11111111-1111-4111-8111-111111111111",
    categoryId: null,
    name: "Suite stay",
    description: "",
    imageUrl: null,
    color: null,
    price: 80,
    facilityPrice: 80,
    unit: "night",
    taxable: true,
    lodgingTypeIds: [],
    eligibleSpecies: [],
    eligibleBreeds: [],
    eligibleWeightTiers: [],
    eligiblePetTags: [],
    blockedPetTags: [],
    locationIds: [],
    requiresEvaluation: false,
    requiresEvaluationOnline: false,
    displayOrder: 0,
    isActive: true,
    locationPricing: [],
    defaultAddOns: [],
    ...over,
  };
}

describe("stayUnits — MoéGo's own example", () => {
  // "Monday to Wednesday is 2 nights or 3 days." This is the whole reason the
  // `unit` column exists, so it is the first thing asserted.
  test("Monday to Wednesday is 2 nights", () => {
    expect(stayUnits("night", 2)).toBe(2);
  });

  test("Monday to Wednesday is 3 days", () => {
    expect(stayUnits("day", 2)).toBe(3);
  });

  test("a same-day stay is one of either, never zero", () => {
    // A zero is a free stay nobody agreed to. `boardingPricing` has always
    // counted a same-day stay as one night; per-day agrees at one too.
    expect(stayUnits("night", 0)).toBe(1);
    expect(stayUnits("day", 0)).toBe(1);
  });

  test("a negative night count cannot produce a negative charge", () => {
    expect(stayUnits("night", -3)).toBe(1);
    expect(stayUnits("day", -3)).toBe(1);
  });

  test("a non-finite night count does not become NaN units", () => {
    expect(stayUnits("night", Number.NaN)).toBe(1);
    expect(stayUnits("day", Number.POSITIVE_INFINITY)).toBe(1);
  });

  test("a fractional night is truncated, not rounded up into a charge", () => {
    expect(stayUnits("night", 2.9)).toBe(2);
    expect(stayUnits("day", 2.9)).toBe(3);
  });
});

describe("resolveBoardingService — the booking picks, it does not guess", () => {
  const suite = service({ id: "svc-suite", rowId: "row-suite" });
  const kennel = service({ id: "svc-kennel", rowId: "row-kennel", price: 40 });
  const all = [suite, kennel];

  test("finds by row uuid", () => {
    expect(resolveBoardingService(all, { serviceId: "row-kennel" })).toBe(
      kennel,
    );
  });

  test("finds by legacy id, which is what the client layer speaks", () => {
    expect(resolveBoardingService(all, { serviceId: "svc-kennel" })).toBe(
      kennel,
    );
  });

  test("NO id resolves to null, so the caller falls back to the class rate", () => {
    // This is the load-bearing one. Every boarding booking made before the
    // cutover carries no service id and was sold at its kennel class's rate.
    // Inventing a service here would re-price it at whatever the facility has
    // edited that service to since.
    expect(resolveBoardingService(all, { serviceId: null })).toBeNull();
    expect(resolveBoardingService(all, {})).toBeNull();
  });

  test("a deleted service falls through rather than re-pricing at another", () => {
    expect(resolveBoardingService(all, { serviceId: "row-gone" })).toBeNull();
  });

  test("an INACTIVE service still resolves — it was sold at that price", () => {
    // Filtering by is_active here would turn every booking against a retired
    // service into a quote_mismatch the moment a facility tidied its menu.
    const retired = service({ rowId: "row-old", isActive: false });
    expect(resolveBoardingService([retired], { serviceId: "row-old" })).toBe(
      retired,
    );
  });
});

describe("servesLodgingType — empty means every type", () => {
  test("a service naming no types may be booked anywhere", () => {
    expect(servesLodgingType(service(), "cat-suite")).toBe(true);
  });

  test("a restricted service admits the type it names", () => {
    const s = service({ lodgingTypeIds: ["cat-suite", "cat-deluxe"] });
    expect(servesLodgingType(s, "cat-deluxe")).toBe(true);
  });

  test("and refuses one it does not", () => {
    const s = service({ lodgingTypeIds: ["cat-suite"] });
    expect(servesLodgingType(s, "cat-condo")).toBe(false);
  });

  test("asking about no type at all is a yes — the service is picked first", () => {
    const s = service({ lodgingTypeIds: ["cat-suite"] });
    expect(servesLodgingType(s, null)).toBe(true);
    expect(servesLodgingType(s, undefined)).toBe(true);
  });
});

describe("lodgingTypesServing — the comparison with two wrong sides", () => {
  // REALISTIC IDS ON BOTH SIDES, which is the whole point of this block.
  // A `RoomCategory`'s app `id` is its `legacy_id`; `lodging_type_ids` is a
  // `uuid[]`. The first version of this filter compared `id` and matched
  // nothing, and the tests above could not catch it because they used
  // `cat-suite` on BOTH sides — a test agreeing with itself.
  const SUITE_UUID = "435bfd1a-7f90-479e-ae0f-64fb6313412a";
  const CONDO_UUID = "9b2c1e77-4a3d-4f21-9c88-1f0b2d3e4a5b";

  const categories = [
    { id: "cat-suite", rowId: SUITE_UUID, name: "Suite" },
    { id: "cat-condo", rowId: CONDO_UUID, name: "Condominium" },
  ];

  test("a service restricted by UUID keeps the category that uuid names", () => {
    expect(
      lodgingTypesServing(categories, {
        lodgingTypeIds: [SUITE_UUID],
      }).map((c) => c.id),
    ).toEqual(["cat-suite"]);
  });

  test("THE BUG: a restriction written with the APP id matches nothing", () => {
    // This is the negative control. If `lodgingTypesServing` ever starts
    // comparing `id`, this returns ["cat-suite"] and the test fails — which
    // is the only way to pin which of two plausible strings is correct.
    expect(
      lodgingTypesServing(categories, { lodgingTypeIds: ["cat-suite"] }),
    ).toEqual([]);
  });

  test("no service at all is every type — the pre-cutover path", () => {
    expect(lodgingTypesServing(categories, null)).toHaveLength(2);
    expect(lodgingTypesServing(categories, undefined)).toHaveLength(2);
  });

  test("an empty restriction is every type", () => {
    expect(
      lodgingTypesServing(categories, { lodgingTypeIds: [] }),
    ).toHaveLength(2);
  });

  test("a category with no uuid yet is never matched by a restriction", () => {
    // A draft the caller has not saved. A restriction cannot name a row that
    // does not exist, and `undefined` must not compare equal to anything.
    const draft = [{ id: "cat-new", name: "New" }];
    expect(
      lodgingTypesServing(draft, { lodgingTypeIds: [SUITE_UUID] }),
    ).toEqual([]);
    // But it survives when nothing is restricting.
    expect(lodgingTypesServing(draft, null)).toHaveLength(1);
  });

  test("it does not mutate or alias the list it was given", () => {
    const out = lodgingTypesServing(categories, null);
    out.pop();
    expect(categories).toHaveLength(2);
  });
});

describe("isPetEligibleForBoarding", () => {
  test("blocked beats eligible, and it is checked first", () => {
    const s = service({
      eligiblePetTags: ["vip"],
      blockedPetTags: ["bites"],
    });
    expect(isPetEligibleForBoarding(s, { petTags: ["vip", "bites"] })).toBe(
      false,
    );
  });

  test("a pet with no recorded weight is not refused by a weight rule", () => {
    // The honest answer to "is this dog allowed" is not "no" when nobody
    // recorded the weight — it is a data-entry gap, not an eligibility one.
    const s = service({ eligibleWeightTiers: ["small"] });
    expect(isPetEligibleForBoarding(s, { weightLb: null })).toBe(true);
  });

  test("but a recorded weight in the wrong band is", () => {
    const s = service({ eligibleWeightTiers: ["small"] });
    expect(isPetEligibleForBoarding(s, { weightLb: 60 })).toBe(false);
  });

  test("species compares case- and space-insensitively", () => {
    const s = service({ eligibleSpecies: ["Dog"] });
    expect(isPetEligibleForBoarding(s, { species: "  dog " })).toBe(true);
  });

  test("empty lists restrict nothing", () => {
    expect(
      isPetEligibleForBoarding(service(), {
        species: "Ferret",
        breed: "Anything",
        weightLb: 200,
        petTags: ["whatever"],
      }),
    ).toBe(true);
  });
});

describe("isBoardingServiceOfferedAt", () => {
  test("empty locationIds is every branch", () => {
    expect(isBoardingServiceOfferedAt(service(), "loc-1")).toBe(true);
  });

  test("a branch-restricted service is refused elsewhere", () => {
    const s = service({ locationIds: ["loc-1"] });
    expect(isBoardingServiceOfferedAt(s, "loc-2")).toBe(false);
    expect(isBoardingServiceOfferedAt(s, "loc-1")).toBe(true);
  });
});

describe("eligibleBoardingServices — what the menu offers", () => {
  const suite = service({
    id: "svc-suite",
    rowId: "row-suite",
    name: "Suite stay",
    displayOrder: 2,
    lodgingTypeIds: ["cat-suite"],
  });
  const anywhere = service({
    id: "svc-any",
    rowId: "row-any",
    name: "Anywhere",
    displayOrder: 1,
  });
  const draft = service({
    id: "svc-draft",
    rowId: "row-draft",
    isActive: false,
  });

  test("a draft is never offered", () => {
    expect(eligibleBoardingServices([draft], {}).map((s) => s.rowId)).toEqual(
      [],
    );
  });

  test("menu order wins over name", () => {
    expect(
      eligibleBoardingServices([suite, anywhere], {}).map((s) => s.name),
    ).toEqual(["Anywhere", "Suite stay"]);
  });

  test("narrowing by an assigned lodging type keeps what serves it", () => {
    expect(
      eligibleBoardingServices(
        [suite, anywhere],
        {},
        {
          lodgingTypeIds: ["cat-suite"],
        },
      ).map((s) => s.rowId),
    ).toEqual(["row-any", "row-suite"]);
  });

  test("and drops what does not", () => {
    expect(
      eligibleBoardingServices(
        [suite, anywhere],
        {},
        {
          lodgingTypeIds: ["cat-condo"],
        },
      ).map((s) => s.rowId),
    ).toEqual(["row-any"]);
  });

  test("ANY assigned type is enough, not all of them", () => {
    // A two-pet stay across a Suite and a Condo may be served by a
    // suite-only service: the suite pet is eligible for it.
    expect(
      eligibleBoardingServices(
        [suite],
        {},
        {
          lodgingTypeIds: ["cat-condo", "cat-suite"],
        },
      ).map((s) => s.rowId),
    ).toEqual(["row-suite"]);
  });
});

describe("boardingWeightTierFor", () => {
  test("the band boundaries are inclusive at the top", () => {
    expect(boardingWeightTierFor(15)).toBe("small");
    expect(boardingWeightTierFor(15.1)).toBe("medium");
    expect(boardingWeightTierFor(35)).toBe("medium");
    expect(boardingWeightTierFor(70)).toBe("large");
    expect(boardingWeightTierFor(70.1)).toBe("giant");
  });

  test("no weight is null, not a band", () => {
    expect(boardingWeightTierFor(null)).toBeNull();
    expect(boardingWeightTierFor(undefined)).toBeNull();
    expect(boardingWeightTierFor(0)).toBeNull();
  });
});

describe("what the menu is judged against, for one booking's pets", () => {
  test("one pet: its species, breed and weight", () => {
    expect(
      boardingPetFactsFor([{ type: "Dog", breed: "Beagle", weight: 24 }]),
    ).toEqual({ species: "Dog", breed: "Beagle", weightLb: 24, petTags: [] });
  });

  test("two dogs: the species holds, breed and weight have no one answer", () => {
    expect(
      boardingPetFactsFor([
        { type: "Dog", breed: "Beagle", weight: 24 },
        { type: "dog ", breed: "Boxer", weight: 61 },
      ]),
    ).toEqual({ species: "Dog", breed: null, weightLb: null, petTags: [] });
  });

  test("a dog and a cat: no species rule can be answered for both", () => {
    expect(
      boardingPetFactsFor([{ type: "Dog" }, { type: "Cat" }]).species,
    ).toBeNull();
  });
});

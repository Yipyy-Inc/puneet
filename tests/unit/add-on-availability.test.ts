import { describe, expect, test } from "bun:test";

import {
  addOnFor,
  addOnPetFacts,
  appliesToService,
  offeredAddOns,
  offeredForPets,
} from "../../src/lib/add-ons/availability";
import type { AddOn } from "../../src/types/add-on";

// ============================================================================
// Which add-ons a booking may offer, and on what terms.
//
// Every picker and the server's re-price ask this one function, so a mistake
// here either offers something the facility ruled out — at a price the bill
// then disagrees with — or hides something a client should have been able to
// book. The gates are the reference's: active, location, service, pet.
// ============================================================================

const BOARDING_SUITE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOARDING_RUN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const DOWNTOWN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const UPTOWN = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

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
  displayOrder: 0,
  overrides: [],
  createdAt: "2026-09-26T00:00:00Z",
  updatedAt: "2026-09-26T00:00:00Z",
};

const BREEDS = [
  { name: "Poodle", species: "Dog" },
  { name: "Beagle", species: "Dog" },
  { name: "Siamese", species: "Cat" },
];

describe("the add-on itself", () => {
  test("an unrestricted, active add-on is offered on its own terms", () => {
    expect(addOnFor(base, { careType: "daycare" })).toEqual({
      unavailable: null,
      price: 15,
      taxable: true,
      durationMin: 10,
    });
  });

  test("an inactive one is not offered", () => {
    expect(
      addOnFor({ ...base, isActive: false }, { careType: "daycare" })
        .unavailable,
    ).toBe("inactive");
  });
});

describe("locations", () => {
  const downtownOnly = { ...base, locationIds: [DOWNTOWN] };

  test("offered where it is sold, and not elsewhere", () => {
    expect(
      addOnFor(downtownOnly, { careType: "daycare", locationId: DOWNTOWN })
        .unavailable,
    ).toBeNull();
    expect(
      addOnFor(downtownOnly, { careType: "daycare", locationId: UPTOWN })
        .unavailable,
    ).toBe("location");
  });

  test("a booking with no location chosen yet is not refused by it", () => {
    expect(
      addOnFor(downtownOnly, { careType: "daycare" }).unavailable,
    ).toBeNull();
  });

  test("a location's override replaces only the fields it sets", () => {
    const overridden: AddOn = {
      ...base,
      overrides: [
        { locationId: UPTOWN, price: 20, taxable: null, durationMin: 15 },
      ],
    };
    expect(
      addOnFor(overridden, { careType: "daycare", locationId: UPTOWN }),
    ).toEqual({ unavailable: null, price: 20, taxable: true, durationMin: 15 });
    expect(
      addOnFor(overridden, { careType: "daycare", locationId: DOWNTOWN }).price,
    ).toBe(15);
  });

  test("an override can switch the tax off at one location", () => {
    const untaxed: AddOn = {
      ...base,
      overrides: [
        { locationId: UPTOWN, price: null, taxable: false, durationMin: null },
      ],
    };
    const terms = addOnFor(untaxed, {
      careType: "daycare",
      locationId: UPTOWN,
    });
    expect(terms.taxable).toBe(false);
    expect(terms.price).toBe(15);
  });
});

describe("applicable services", () => {
  const suiteOnly = {
    appliesToAllServices: false,
    serviceRefs: [`boarding:${BOARDING_SUITE}`],
  };

  test("all services, including ones created later", () => {
    expect(appliesToService(base, "grooming", "whatever")).toBe(true);
    expect(appliesToService(base, "pool-party")).toBe(true);
  });

  test("a named service, and not its neighbour", () => {
    expect(appliesToService(suiteOnly, "boarding", BOARDING_SUITE)).toBe(true);
    expect(appliesToService(suiteOnly, "boarding", BOARDING_RUN)).toBe(false);
    expect(appliesToService(suiteOnly, "daycare")).toBe(false);
  });

  test("with no service chosen yet, any service of that type counts", () => {
    expect(appliesToService(suiteOnly, "boarding")).toBe(true);
    expect(appliesToService(suiteOnly, "boarding", null)).toBe(true);
  });

  test("training, evaluation and a custom module are named by type", () => {
    const refs = {
      appliesToAllServices: false,
      serviceRefs: ["training", "evaluation", "custom:pool-party"],
    };
    expect(appliesToService(refs, "training")).toBe(true);
    expect(appliesToService(refs, "evaluation")).toBe(true);
    expect(appliesToService(refs, "pool-party")).toBe(true);
    expect(appliesToService(refs, "grooming")).toBe(false);
  });

  test("addOnFor says why", () => {
    expect(
      addOnFor(
        { ...base, ...suiteOnly },
        { careType: "boarding", serviceId: BOARDING_RUN },
      ).unavailable,
    ).toBe("service");
  });
});

describe("pet details", () => {
  const dogsOnly = { ...base, eligibleSpecies: ["Dog"] };

  test("type: the facility's own species names, compared case-folded", () => {
    expect(
      addOnFor(dogsOnly, { careType: "grooming", pet: { species: "dog" } })
        .unavailable,
    ).toBeNull();
    expect(
      addOnFor(dogsOnly, { careType: "grooming", pet: { species: "Cat" } })
        .unavailable,
    ).toBe("species");
  });

  test("breed: chosen within a type, so it leaves the other types alone", () => {
    const poodles = { ...base, eligibleBreeds: ["Poodle"] };
    const at = (species: string, breed: string) =>
      addOnFor(poodles, {
        careType: "grooming",
        pet: { species, breed },
        breeds: BREEDS,
      }).unavailable;
    expect(at("Dog", "poodle")).toBeNull();
    expect(at("Dog", "Beagle")).toBe("breed");
    // No cat breed is named, so every cat may have it.
    expect(at("Cat", "Siamese")).toBeNull();
  });

  test("breed: without the breed list nothing can tell, so it does not exclude", () => {
    const poodles = { ...base, eligibleBreeds: ["Poodle"] };
    expect(
      addOnFor(poodles, {
        careType: "grooming",
        pet: { species: "Dog", breed: "Beagle" },
      }).unavailable,
    ).toBeNull();
  });

  test("weight: the size tiers the services use", () => {
    const small = { ...base, eligibleWeightTiers: ["small" as const] };
    expect(
      addOnFor(small, { careType: "daycare", pet: { weightLb: 12 } })
        .unavailable,
    ).toBeNull();
    expect(
      addOnFor(small, { careType: "daycare", pet: { weightLb: 40 } })
        .unavailable,
    ).toBe("weight");
  });

  test("coat type", () => {
    const longCoats = { ...base, eligibleCoatTypes: ["long" as const] };
    expect(
      addOnFor(longCoats, { careType: "grooming", pet: { coatType: "Long" } })
        .unavailable,
    ).toBeNull();
    expect(
      addOnFor(longCoats, { careType: "grooming", pet: { coatType: "short" } })
        .unavailable,
    ).toBe("coat");
  });

  test("what the record does not say does not exclude", () => {
    const strict: AddOn = {
      ...base,
      eligibleSpecies: ["Dog"],
      eligibleBreeds: ["Poodle"],
      eligibleWeightTiers: ["small"],
      eligibleCoatTypes: ["long"],
    };
    expect(
      addOnFor(strict, { careType: "grooming", pet: {}, breeds: BREEDS })
        .unavailable,
    ).toBeNull();
    expect(addOnFor(strict, { careType: "grooming" }).unavailable).toBeNull();
  });
});

describe("offeredAddOns", () => {
  test("keeps what may be offered, in the order given, with its terms", () => {
    const walk = { ...base, id: "walk", name: "Walk", price: 10 };
    const paused = { ...base, id: "paused", isActive: false };
    const uptownOnly = { ...base, id: "uptown", locationIds: [UPTOWN] };
    const offered = offeredAddOns([walk, paused, uptownOnly], {
      careType: "daycare",
      locationId: DOWNTOWN,
    });
    expect(offered.map((o) => o.addOn.id)).toEqual(["walk"]);
    expect(offered[0].terms.price).toBe(10);
  });
});

describe("offeredForPets", () => {
  const smallDogs = {
    ...base,
    id: "small",
    eligibleWeightTiers: ["small" as const],
  };

  test("an add-on for the whole booking must suit every pet on it", () => {
    const at = { careType: "grooming" };
    const pets = [{ weightLb: 12 }, { weightLb: 60 }];
    expect(
      offeredForPets([base, smallDogs], at, pets).map((o) => o.addOn.id),
    ).toEqual([base.id]);
    expect(
      offeredForPets([base, smallDogs], at, [{ weightLb: 12 }]).map(
        (o) => o.addOn.id,
      ),
    ).toEqual([base.id, "small"]);
  });

  test("with no pet chosen yet, the booking alone decides", () => {
    expect(
      offeredForPets([base, smallDogs], { careType: "grooming" }, []).length,
    ).toBe(2);
  });
});

describe("addOnPetFacts", () => {
  test("a weight of 0 and an empty breed are 'not recorded', not facts", () => {
    expect(
      addOnPetFacts({ type: "Dog", breed: "", weight: 0, coatType: "long" }),
    ).toEqual({
      species: "Dog",
      breed: null,
      weightLb: null,
      coatType: "long",
    });
  });

  test("so a pet with no weight on file is not refused by a weight limit", () => {
    const small = { ...base, eligibleWeightTiers: ["small" as const] };
    expect(
      addOnFor(small, {
        careType: "daycare",
        pet: addOnPetFacts({ type: "Dog", weight: 0 }),
      }).unavailable,
    ).toBeNull();
  });
});

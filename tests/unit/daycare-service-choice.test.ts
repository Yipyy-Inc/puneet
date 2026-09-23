import { describe, expect, test } from "bun:test";

import {
  eligibleDaycareServices,
  isOfferedAt,
  isPetEligible,
  legacyServiceForHours,
  resolveDaycareService,
  rolloverTarget,
  weightTierFor,
} from "@/lib/pricing/daycare-service-choice";
import type { DaycareService } from "@/lib/api/mappers/daycare-service";

// ============================================================================
// WHICH DAYCARE SERVICE, AND WHY THAT ONE.
//
// Four callers resolve a daycare service and they must land on the SAME row:
// the wizard's quote, the server's re-price (which refuses the booking on a
// mismatch), auto-confirm, and the tax decision. One module, so this is the
// one place the rule is stated — and the one place it can be wrong.
//
// The rule these mostly exist to hold down is the quiet one: EMPTY MEANS NO
// RESTRICTION. Every eligibility list is `text[] not null default '{}'`, so an
// empty list is "any pet", not "no pet". Getting that backwards would empty
// every facility's menu on the day it shipped.
// ============================================================================

function service(over: Partial<DaycareService> = {}): DaycareService {
  return {
    id: "svc",
    rowId: "row-svc",
    categoryId: null,
    name: "Full day",
    description: "",
    imageUrl: null,
    color: null,
    price: 40,
    facilityPrice: 40,
    taxable: true,
    maxDurationHours: 10,
    rolloverAfterMinutes: null,
    rolloverToServiceId: null,
    eligibleSpecies: [],
    eligibleBreeds: [],
    eligibleWeightTiers: [],
    eligiblePetTags: [],
    blockedPetTags: [],
    allowedSectionIds: [],
    includedAddOnIds: [],
    locationIds: [],
    requiresEvaluation: false,
    requiresEvaluationOnline: false,
    displayOrder: 0,
    isActive: true,
    locationPricing: [],
    ...over,
  };
}

describe("weight bands", () => {
  test("a weight lands in the band the facility's tiers describe", () => {
    expect(weightTierFor(10)).toBe("small");
    expect(weightTierFor(15), "the boundary belongs to the band below").toBe(
      "small",
    );
    expect(weightTierFor(16)).toBe("medium");
    expect(weightTierFor(35)).toBe("medium");
    expect(weightTierFor(70)).toBe("large");
    expect(weightTierFor(71), "past every ceiling").toBe("giant");
  });

  test("no weight is not a band", () => {
    // Distinct from "giant". A pet with no weight recorded must not be sorted
    // into the heaviest band and refused a service on that basis.
    expect(weightTierFor(null)).toBeNull();
    expect(weightTierFor(undefined)).toBeNull();
    expect(weightTierFor(0)).toBeNull();
  });
});

describe("who may have this service", () => {
  test("a service with no rules is open to every pet", () => {
    // THE DEFAULT, and the one that would empty every menu if inverted.
    expect(isPetEligible(service(), {})).toBe(true);
    expect(
      isPetEligible(service(), {
        species: "Cat",
        breed: "Anything",
        weightLb: 400,
        petTags: ["t1"],
      }),
    ).toBe(true);
  });

  test("species is matched case- and space-insensitively", () => {
    const dogsOnly = service({ eligibleSpecies: ["Dog"] });
    expect(isPetEligible(dogsOnly, { species: "dog" })).toBe(true);
    expect(isPetEligible(dogsOnly, { species: "  DOG " })).toBe(true);
    expect(isPetEligible(dogsOnly, { species: "Cat" })).toBe(false);
  });

  test("a pet whose species is unknown is not excluded by a species rule", () => {
    // Nobody can act on "unavailable because we do not know what it is".
    expect(isPetEligible(service({ eligibleSpecies: ["Dog"] }), {})).toBe(true);
  });

  test("a weight rule excludes the wrong band and spares an unrecorded one", () => {
    const smallOnly = service({ eligibleWeightTiers: ["small"] });
    expect(isPetEligible(smallOnly, { weightLb: 10 })).toBe(true);
    expect(isPetEligible(smallOnly, { weightLb: 40 })).toBe(false);
    expect(
      isPetEligible(smallOnly, {}),
      "no weight on the record is not a refusal",
    ).toBe(true);
  });

  test("an eligible tag is required when the service names any", () => {
    const vip = service({ eligiblePetTags: ["tag-vip"] });
    expect(isPetEligible(vip, { petTags: ["tag-vip"] })).toBe(true);
    expect(isPetEligible(vip, { petTags: ["tag-other"] })).toBe(false);
    expect(isPetEligible(vip, {}), "no tags at all").toBe(false);
  });

  test("BLOCKED BEATS ELIGIBLE, even on the same pet", () => {
    // The whole point of a blocking code: it wins. A pet carrying both is out.
    const both = service({
      eligiblePetTags: ["tag-vip"],
      blockedPetTags: ["tag-bites"],
    });
    expect(isPetEligible(both, { petTags: ["tag-vip"] })).toBe(true);
    expect(
      isPetEligible(both, { petTags: ["tag-vip", "tag-bites"] }),
      "eligible and blocked at once is BLOCKED",
    ).toBe(false);
  });

  test("breed is matched as the owner typed it, ignoring case and padding", () => {
    const poodles = service({ eligibleBreeds: ["Poodle"] });
    expect(isPetEligible(poodles, { breed: "poodle" })).toBe(true);
    expect(isPetEligible(poodles, { breed: "Labrador" })).toBe(false);
  });
});

describe("where it is offered", () => {
  test("no locations named means every branch", () => {
    expect(isOfferedAt(service(), "loc-1")).toBe(true);
  });

  test("a named branch list excludes the others", () => {
    const here = service({ locationIds: ["loc-1"] });
    expect(isOfferedAt(here, "loc-1")).toBe(true);
    expect(isOfferedAt(here, "loc-2")).toBe(false);
    expect(isOfferedAt(here, null), "asking about no branch").toBe(true);
  });
});

describe("the menu a pet is offered", () => {
  test("drafts are never offered", () => {
    // An inactive service is something the facility is still working on.
    const menu = eligibleDaycareServices(
      [
        service({ id: "live", isActive: true }),
        service({ id: "draft", isActive: false }),
      ],
      {},
    );
    expect(menu.map((s) => s.id)).toEqual(["live"]);
  });

  test("it comes back in the facility's own order", () => {
    const menu = eligibleDaycareServices(
      [
        service({ id: "c", displayOrder: 2 }),
        service({ id: "a", displayOrder: 0 }),
        service({ id: "b", displayOrder: 1 }),
      ],
      {},
    );
    expect(menu.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  test("eligibility and branch are both applied", () => {
    const menu = eligibleDaycareServices(
      [
        service({ id: "dogs", eligibleSpecies: ["Dog"] }),
        service({ id: "cats", eligibleSpecies: ["Cat"] }),
        service({ id: "elsewhere", locationIds: ["loc-2"] }),
      ],
      { species: "Dog" },
      "loc-1",
    );
    expect(menu.map((s) => s.id)).toEqual(["dogs"]);
  });
});

describe("the service a booking is priced from", () => {
  const full = service({ id: "full", rowId: "row-full", price: 40 });
  const half = service({
    id: "half",
    rowId: "row-half",
    price: 24,
    maxDurationHours: 5,
  });

  test("the id the booking carries wins, whatever it costs", () => {
    // THE POINT OF THE WHOLE CHANGE. The dearer service is chosen because the
    // facility chose it, not because an algorithm preferred it.
    expect(
      resolveDaycareService([full, half], { serviceId: "row-full", hours: 3 })
        ?.id,
    ).toBe("full");
  });

  test("the app id resolves as well as the row id", () => {
    // A rate migrated out of the old setting keeps `rate-full-day` as its id.
    expect(resolveDaycareService([full, half], { serviceId: "full" })?.id).toBe(
      "full",
    );
  });

  test("a booking made before the cutover falls back to the old rule", () => {
    // No id at all: the CHEAPEST active service whose ceiling covers the stay,
    // which is what it was sold at.
    expect(resolveDaycareService([full, half], { hours: 4 })?.id).toBe("half");
    expect(
      resolveDaycareService([full, half], { hours: 8 })?.id,
      "half day does not cover eight hours",
    ).toBe("full");
  });

  test("a service that has since been deleted falls back, not silently re-prices", () => {
    expect(
      resolveDaycareService([full, half], { serviceId: "row-gone", hours: 4 })
        ?.id,
    ).toBe("half");
  });

  test("nothing covering the stay is a GAP, never a zero", () => {
    // A zero is a free day nobody agreed to. The wizard renders null as a
    // refusal, which is the only honest answer.
    expect(legacyServiceForHours([half], 9)).toBeNull();
  });

  test("a service with no ceiling covers any stay", () => {
    const open = service({ id: "open", maxDurationHours: null, price: 99 });
    expect(legacyServiceForHours([open], 24)?.id).toBe("open");
  });
});

describe("auto rollover", () => {
  const full = service({ id: "full", rowId: "row-full", price: 40 });

  test("a stay inside the ceiling plus its grace does not roll over", () => {
    const half = service({
      id: "half",
      rowId: "row-half",
      maxDurationHours: 4,
      rolloverAfterMinutes: 30,
      rolloverToServiceId: "row-full",
    });
    // MoéGo's own example: a 4-hour service with 30 minutes of grace becomes
    // Full Day at 4 h 30, so 4 h 29 is still a half day.
    expect(rolloverTarget(half, [half, full], 4)).toBeNull();
    expect(rolloverTarget(half, [half, full], 4.5)).toBeNull();
    expect(rolloverTarget(half, [half, full], 4.51)?.id).toBe("full");
  });

  test("a ceiling with no rollover configured is just a ceiling", () => {
    const capped = service({ maxDurationHours: 4 });
    expect(rolloverTarget(capped, [capped, full], 12)).toBeNull();
  });

  test("no ceiling means nothing to roll over past", () => {
    const open = service({
      maxDurationHours: null,
      rolloverAfterMinutes: 30,
      rolloverToServiceId: "row-full",
    });
    expect(rolloverTarget(open, [open, full], 99)).toBeNull();
  });

  test("a target that no longer exists rolls over to nothing", () => {
    const orphan = service({
      maxDurationHours: 1,
      rolloverAfterMinutes: 0,
      rolloverToServiceId: "row-deleted",
    });
    expect(rolloverTarget(orphan, [orphan], 10)).toBeNull();
  });
});

import { describe, expect, test } from "bun:test";

import { boardingNightlyRate, boardingPricing } from "@/lib/boarding-pricing";
import type { BoardingService } from "@/lib/api/mappers/boarding-service";
import type { FacilityRoom, RoomCategory } from "@/types/rooms";

// ============================================================================
// What a boarding stay costs once a SERVICE can stand in front of the class.
//
// ── THE ASSERTION THIS FILE EXISTS FOR ────────────────────────────────────
//
// Phase 5 carried every priced kennel class across into `boarding_services` at
// an IDENTICAL price, per night, restricted to the class it came from. So a
// facility that never opens the new menu must be quoted exactly what it was
// quoted the day before. "Price-neutral" is a claim about arithmetic, and this
// is where it is measured rather than believed — 459 boarding bookings rest on
// those numbers.
// ============================================================================

function category(over: Partial<RoomCategory> = {}): RoomCategory {
  return {
    id: "cat-suite",
    service: "boarding",
    name: "Suite",
    color: "blue",
    sortOrder: 0,
    rules: [],
    defaultCapacity: 2,
    defaultBasePrice: 80,
    visibleToClients: true,
    active: true,
    locationPricing: [],
    ...over,
  };
}

function room(over: Partial<FacilityRoom> = {}): FacilityRoom {
  return {
    id: "room-1",
    categoryId: "cat-suite",
    name: "Suite 1",
    active: true,
    rules: [],
    ...over,
  };
}

function service(over: Partial<BoardingService> = {}): BoardingService {
  return {
    id: "svc-cat-suite",
    rowId: "row-suite",
    categoryId: null,
    name: "Suite stay",
    description: "",
    imageUrl: null,
    color: null,
    price: 80,
    facilityPrice: 80,
    unit: "night",
    taxable: true,
    lodgingTypeIds: ["cat-suite"],
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

const CATEGORIES = [
  category(),
  category({ id: "cat-condo", name: "Condominium", defaultBasePrice: 38 }),
  category({ id: "cat-unpriced", name: "New", defaultBasePrice: undefined }),
];
const ROOMS = [
  room(),
  room({ id: "room-2", name: "Suite 2" }),
  room({ id: "room-c1", categoryId: "cat-condo", name: "Condo 1" }),
];

describe("the cutover is price-neutral", () => {
  // The migration's own rule: price carried identically, unit 'night',
  // lodging_type_ids = [the class it came from]. So for every stay, quoting
  // through the derived service and quoting through the class must agree.
  const CASES: Array<{ label: string; categoryId: string; price: number }> = [
    { label: "Suite at $80", categoryId: "cat-suite", price: 80 },
    { label: "Condominium at $38", categoryId: "cat-condo", price: 38 },
  ];

  for (const c of CASES) {
    test(`${c.label}: the derived service quotes what the class quoted`, () => {
      const assignments = [{ petId: 1, roomId: c.categoryId }];
      const viaClass = boardingPricing({
        categories: CATEGORIES,
        rooms: ROOMS,
        roomAssignments: assignments,
        nights: 3,
      });
      const viaService = boardingPricing({
        categories: CATEGORIES,
        rooms: ROOMS,
        roomAssignments: assignments,
        nights: 3,
        service: service({
          price: c.price,
          facilityPrice: c.price,
          lodgingTypeIds: [c.categoryId],
        }),
      });
      expect(viaService.total).toBe(viaClass.total);
      expect(viaService.perUnit).toBe(viaClass.perUnit);
      expect(viaClass.total).toBe(c.price * 3);
    });
  }

  test("a two-kennel stay is still two kennels under a service", () => {
    // The substitution replaces the RATE, not the arithmetic. Summing per
    // assignment instead of per distinct room would double-charge a shared
    // suite, which is the bug the distinct-room rule was written for.
    const assignments = [
      { petId: 1, roomId: "cat-suite" },
      { petId: 2, roomId: "cat-condo" },
    ];
    const viaClass = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: assignments,
      nights: 2,
    });
    expect(viaClass.total).toBe((80 + 38) * 2);

    // One service across both kennels: its rate, twice, because there are two.
    const viaService = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: assignments,
      nights: 2,
      service: service({ price: 80, lodgingTypeIds: [] }),
    });
    expect(viaService.total).toBe(80 * 2 * 2);
  });

  test("two pets in ONE room are one room being paid for once", () => {
    const assignments = [
      { petId: 1, roomId: "room-1" },
      { petId: 2, roomId: "room-1" },
    ];
    expect(
      boardingPricing({
        categories: CATEGORIES,
        rooms: ROOMS,
        roomAssignments: assignments,
        nights: 2,
        service: service(),
      }).total,
    ).toBe(80 * 2);
  });
});

describe("the unit decides the quantity", () => {
  const assignments = [{ petId: 1, roomId: "cat-suite" }];

  test("per night, Monday to Wednesday is 2 × the rate", () => {
    const p = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: assignments,
      nights: 2,
      service: service({ unit: "night", price: 50 }),
    });
    expect(p.unit).toBe("night");
    expect(p.total).toBe(100);
  });

  test("per day, the same stay is 3 × the rate", () => {
    const p = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: assignments,
      nights: 2,
      service: service({ unit: "day", price: 50 }),
    });
    expect(p.unit).toBe("day");
    expect(p.total).toBe(150);
  });

  test("with no service the unit is night, as it always was", () => {
    const p = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: assignments,
      nights: 2,
    });
    expect(p.unit).toBe("night");
  });
});

describe("a gap names the thing the facility has to fix", () => {
  test("an unpriced CLASS names the class, as before", () => {
    const p = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [{ petId: 1, roomId: "cat-unpriced" }],
      nights: 1,
    });
    expect(p.unpricedClasses).toEqual(["New"]);
    expect(p.total).toBe(0);
  });

  test("an unpriced SERVICE names the service", () => {
    // `boarding_services.price` is `not null default 0`, so a facility that
    // adds a service and never prices it holds a zero — which is "not yet",
    // not "free". Naming the class here would point at the wrong screen.
    const p = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [{ petId: 1, roomId: "cat-suite" }],
      nights: 1,
      service: service({ price: 0, name: "Unpriced stay" }),
    });
    expect(p.unpricedClasses).toEqual(["Unpriced stay"]);
    expect(p.total).toBe(0);
  });

  test("a PRICED service rescues a class the facility never priced", () => {
    // This is the separation paying for itself: the menu carries the money,
    // so a lodging type with no rate of its own is no longer a dead end.
    const p = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [{ petId: 1, roomId: "cat-unpriced" }],
      nights: 2,
      service: service({ price: 65, lodgingTypeIds: [] }),
    });
    expect(p.unpricedClasses).toEqual([]);
    expect(p.total).toBe(130);
  });
});

describe("the branch price still wins on the class path", () => {
  test("a branch override replaces defaultBasePrice for that branch", () => {
    const cats = [
      category({ locationPricing: [{ locationId: "loc-1", price: 95 }] }),
    ];
    expect(
      boardingPricing({
        categories: cats,
        rooms: ROOMS,
        roomAssignments: [{ petId: 1, roomId: "cat-suite" }],
        nights: 1,
        locationId: "loc-1",
      }).total,
    ).toBe(95);
  });

  test("and the service's own branch price is already resolved by the mapper", () => {
    // `rowToBoardingService` resolves `price` for the branch asked about, so
    // by the time it reaches here there is one number and no second lookup —
    // the same discipline daycare's picker follows, and the reason the
    // customer path must pass its branch.
    expect(
      boardingPricing({
        categories: CATEGORIES,
        rooms: ROOMS,
        roomAssignments: [{ petId: 1, roomId: "cat-suite" }],
        nights: 1,
        locationId: "loc-1",
        service: service({ price: 95, facilityPrice: 80 }),
      }).total,
    ).toBe(95);
  });
});

describe("boardingNightlyRate is a weight, not a charge", () => {
  test("it reports one room's rate for splitting a multi-pet stay", () => {
    expect(
      boardingNightlyRate({
        categories: CATEGORIES,
        rooms: ROOMS,
        roomAssignments: [{ petId: 1, roomId: "cat-condo" }],
      }),
    ).toBe(38);
  });

  test("and zero when there is no rate, rather than throwing", () => {
    expect(
      boardingNightlyRate({
        categories: CATEGORIES,
        rooms: ROOMS,
        roomAssignments: [{ petId: 1, roomId: "cat-unpriced" }],
      }),
    ).toBe(0);
  });
});

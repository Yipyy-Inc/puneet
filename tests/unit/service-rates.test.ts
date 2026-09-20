import { describe, expect, it } from "bun:test";

import { boardingPricing, boardingNightlyRate } from "@/lib/boarding-pricing";
import { daycareDayRate } from "@/lib/daycare-pricing";
import type { DaycareRate } from "@/types/daycare";
import type { FacilityRoom, RoomCategory } from "@/types/rooms";

// ============================================================================
// A service with no rate is UNPRICED, not 45.
//
// Both modules used to fall back to `<service>_config.basePrice` — a fixture's
// number (boarding 45, daycare 35), the same for every facility in the
// product, that nobody at any facility had chosen. These tests pin the two
// things that replaced it: the facility's own rate is used, and its ABSENCE
// is reported rather than papered over.
// ============================================================================

function category(
  id: string,
  name: string,
  defaultBasePrice: number | undefined,
  locationPricing: Array<{ locationId: string; price: number }> = [],
): RoomCategory {
  return {
    id,
    facilityId: 11,
    service: "boarding",
    name,
    description: "",
    color: "slate",
    sortOrder: 1,
    active: true,
    rules: [],
    defaultCapacity: 1,
    defaultBasePrice,
    visibleToClients: true,
    locationPricing,
  } as RoomCategory;
}

function room(id: string, categoryId: string, name = id): FacilityRoom {
  return {
    id,
    categoryId,
    facilityId: 11,
    name,
    active: true,
    rules: [],
  } as FacilityRoom;
}

const SUITE = category("cat-suite", "Suite", 55);
const CONDO = category("cat-condo", "Condominium", 38);
const UNPRICED = category("cat-new", "Isolation Room", undefined);

const ROOMS = [
  room("suite-01", "cat-suite"),
  room("suite-02", "cat-suite"),
  room("condo-01", "cat-condo"),
  room("new-01", "cat-new"),
];
const CATEGORIES = [SUITE, CONDO, UNPRICED];

describe("boardingPricing", () => {
  it("prices a stay by the class each pet is in", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [
        { petId: 1, roomId: "suite-01" },
        { petId: 2, roomId: "condo-01" },
      ],
      nights: 3,
    });
    expect(result.perNight).toBe(93);
    expect(result.total).toBe(279);
    expect(result.unpricedClasses).toEqual([]);
  });

  it("charges a shared room once, not once per pet", () => {
    const shared = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [
        { petId: 1, roomId: "suite-01" },
        { petId: 2, roomId: "suite-01" },
      ],
      nights: 2,
    });
    expect(shared.perNight).toBe(55);
    expect(shared.total).toBe(110);
  });

  it("counts a same-day stay as one night", () => {
    const sameDay = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [{ petId: 1, roomId: "condo-01" }],
      nights: 0,
    });
    expect(sameDay.total).toBe(38);
  });

  it("lets a branch's own price beat the class default", () => {
    const branch = category("cat-suite", "Suite", 55, [
      { locationId: "loc-west", price: 70 },
    ]);
    const result = boardingPricing({
      categories: [branch],
      rooms: [room("suite-01", "cat-suite")],
      roomAssignments: [{ petId: 1, roomId: "suite-01" }],
      nights: 1,
      locationId: "loc-west",
    });
    expect(result.total).toBe(70);
  });

  it("ignores a branch override for a different branch", () => {
    const branch = category("cat-suite", "Suite", 55, [
      { locationId: "loc-west", price: 70 },
    ]);
    const result = boardingPricing({
      categories: [branch],
      rooms: [room("suite-01", "cat-suite")],
      roomAssignments: [{ petId: 1, roomId: "suite-01" }],
      nights: 1,
      locationId: "loc-east",
    });
    expect(result.total).toBe(55);
  });

  // The whole point of the change: no invented number stands in.
  it("names a class with no rate instead of charging a default", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [{ petId: 1, roomId: "new-01" }],
      nights: 4,
    });
    expect(result.unpricedClasses).toEqual(["Isolation Room"]);
    expect(result.perNight).toBe(0);
    expect(result.total).toBe(0);
  });

  it("still prices the classes it can, and names only the one it cannot", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [
        { petId: 1, roomId: "condo-01" },
        { petId: 2, roomId: "new-01" },
      ],
      nights: 1,
    });
    expect(result.perNight).toBe(38);
    expect(result.unpricedClasses).toEqual(["Isolation Room"]);
  });

  it("names an unpriced class once however many pets are in it", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: [...ROOMS, room("new-02", "cat-new")],
      roomAssignments: [
        { petId: 1, roomId: "new-01" },
        { petId: 2, roomId: "new-02" },
      ],
      nights: 1,
    });
    expect(result.unpricedClasses).toEqual(["Isolation Room"]);
  });

  it("reports nothing to price before a kennel is chosen", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [],
      nights: 2,
    });
    expect(result.total).toBe(0);
    expect(result.unpricedClasses).toEqual([]);
  });

  // The wizard assigns a room TYPE and the server picks the room, so an
  // assignment may name either. Only the room case resolved here, and a type
  // fell through to the flat service rate.
  it("prices an assignment that names a class rather than a room", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [{ petId: 1, roomId: "cat-suite" }],
      nights: 2,
    });
    expect(result.perNight).toBe(55);
    expect(result.total).toBe(110);
    expect(result.unpricedClasses).toEqual([]);
  });

  it("names an unpriced class assigned by type", () => {
    const result = boardingPricing({
      categories: CATEGORIES,
      rooms: ROOMS,
      roomAssignments: [{ petId: 1, roomId: "cat-new" }],
      nights: 1,
    });
    expect(result.unpricedClasses).toEqual(["Isolation Room"]);
  });

  it("weighs one room for splitting a multi-pet stay", () => {
    expect(
      boardingNightlyRate({
        categories: CATEGORIES,
        rooms: ROOMS,
        roomAssignments: [{ petId: 1, roomId: "suite-02" }],
      }),
    ).toBe(55);
  });
});

function rate(type: string, basePrice: number, isActive = true): DaycareRate {
  return {
    id: `rate-${type}`,
    name: type,
    type,
    basePrice,
    description: "",
    durationHours: type === "half-day" ? 5 : 10,
    isActive,
    sizePricing: { small: 0, medium: 0, large: 0, giant: 0 },
  } as DaycareRate;
}

describe("daycareDayRate", () => {
  const RATES = [rate("full-day", 38), rate("half-day", 24)];

  it("uses the facility's own full-day rate", () => {
    expect(daycareDayRate({ rates: RATES, half: false })).toBe(38);
  });

  it("uses the facility's own half-day rate rather than halving", () => {
    expect(daycareDayRate({ rates: RATES, half: true })).toBe(24);
  });

  it("halves the full day when there is no half-day rate", () => {
    expect(daycareDayRate({ rates: [rate("full-day", 38)], half: true })).toBe(
      19,
    );
  });

  it("ignores a rate the facility has turned off", () => {
    expect(
      daycareDayRate({ rates: [rate("full-day", 38, false)], half: false }),
    ).toBeNull();
  });

  it("lets a branch's own price beat the rate card", () => {
    expect(daycareDayRate({ branchPrice: 44, rates: RATES, half: false })).toBe(
      44,
    );
    expect(daycareDayRate({ branchPrice: 44, rates: RATES, half: true })).toBe(
      22,
    );
  });

  it("is null when the facility has set no daycare price at all", () => {
    expect(daycareDayRate({ rates: [], half: false })).toBeNull();
    expect(daycareDayRate({ rates: [], half: true })).toBeNull();
    expect(
      daycareDayRate({ branchPrice: null, rates: [], half: false }),
    ).toBeNull();
  });

  // Zero is a price a facility may genuinely set; null is the absence of one.
  it("keeps a free day distinct from an unpriced one", () => {
    expect(daycareDayRate({ rates: [rate("full-day", 0)], half: false })).toBe(
      0,
    );
    expect(daycareDayRate({ branchPrice: 0, rates: [], half: false })).toBe(0);
  });
});

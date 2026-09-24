import { describe, expect, test } from "bun:test";

import {
  isCountedInPets,
  lodgingOccupancy,
  lodgingPlacesLeft,
  petsOnBooking,
} from "@/lib/boarding/lodging-occupancy";

// ============================================================================
// How full a lodging type is, counted MoéGo's way.
//
// Pure arithmetic, no browser, no database — but it is the arithmetic three
// screens draw and one of them decides whether a booking may be taken, so the
// negative controls matter more than the happy paths.
//
// THE ASSERTION THIS FILE EXISTS FOR: an Area with room for twelve dogs must
// not read 1 / 1 (100%) when one dog walks in. That was the behaviour of every
// board until this module existed, because `space_type` was stored, enforced
// and editable while nothing that drew a number had heard of it.
// ============================================================================

const ROOM = { spaceType: "room" as const, maxPetsPerArea: undefined };
const AREA = { spaceType: "area" as const, maxPetsPerArea: 12 };

const UNITS = [{ id: "u1" }, { id: "u2" }, { id: "u3" }];

describe("a room type is counted in rooms", () => {
  test("one guest fills the room they are in, and only that one", () => {
    const o = lodgingOccupancy(ROOM, UNITS, {
      occupiedUnitIds: new Set(["u1"]),
    });
    expect(o).toEqual({
      countedIn: "rooms",
      used: 1,
      capacity: 3,
      percent: 33,
    });
  });

  test("a unit out of service is not capacity the facility has tonight", () => {
    const o = lodgingOccupancy(ROOM, [...UNITS, { id: "u4", active: false }], {
      occupiedUnitIds: new Set(["u1"]),
    });
    expect(o.capacity).toBe(3);
  });

  test("`active` absent means in service", () => {
    expect(lodgingOccupancy(ROOM, [{ id: "u1" }], {}).capacity).toBe(1);
  });

  test("an occupied unit that is out of service counts as neither", () => {
    const o = lodgingOccupancy(ROOM, [{ id: "u1", active: false }], {
      occupiedUnitIds: new Set(["u1"]),
    });
    expect(o).toEqual({
      countedIn: "rooms",
      used: 0,
      capacity: 0,
      percent: 0,
    });
  });

  test("no usage at all is empty, not full", () => {
    expect(lodgingOccupancy(ROOM, UNITS, {}).used).toBe(0);
  });
});

describe("an area is counted in pets — the whole point", () => {
  test("ONE DOG IN A TWELVE-DOG YARD IS NOT A FULL YARD", () => {
    // The defect this module was written for. Every board read 1 / 1 (100%).
    const o = lodgingOccupancy(AREA, [{ id: "u1" }], {
      petsByUnit: new Map([["u1", 1]]),
    });
    expect(o).toEqual({ countedIn: "pets", used: 1, capacity: 12, percent: 8 });
  });

  test("the maximum is PER UNIT, exactly as the trigger reads it", () => {
    // `private.boarding_area_within_capacity` reads max_pets_per_area from the
    // unit's category and compares it against the pets in THAT unit. Three
    // twelve-dog yards are thirty-six places. A screen that disagrees with the
    // constraint promises a stay will fit and then watches the save fail.
    const o = lodgingOccupancy(AREA, UNITS, {
      petsByUnit: new Map([
        ["u1", 5],
        ["u2", 2],
      ]),
    });
    expect(o.capacity).toBe(36);
    expect(o.used).toBe(7);
    expect(o.percent).toBe(19);
  });

  test("pets in a unit that is out of service are not counted either way", () => {
    const o = lodgingOccupancy(
      AREA,
      [{ id: "u1" }, { id: "u2", active: false }],
      {
        petsByUnit: new Map([
          ["u1", 3],
          ["u2", 9],
        ]),
      },
    );
    expect(o.capacity).toBe(12);
    expect(o.used).toBe(3);
  });

  test("a full yard is 100%, and full is not an error", () => {
    const o = lodgingOccupancy(AREA, [{ id: "u1" }], {
      petsByUnit: new Map([["u1", 12]]),
    });
    expect(o.percent).toBe(100);
    expect(lodgingPlacesLeft(o)).toBe(0);
  });

  test("a recorded override may exceed, and the number stays honest", () => {
    // §2b: at capacity it stays orange, full is not an error. Clamping here
    // would hide the one case somebody actually has to see.
    const o = lodgingOccupancy(AREA, [{ id: "u1" }], {
      petsByUnit: new Map([["u1", 13]]),
    });
    expect(o.used).toBe(13);
    expect(o.percent).toBe(108);
    // But "‑1 spots left" is nonsense on a screen.
    expect(lodgingPlacesLeft(o)).toBe(0);
  });
});

describe("an area with no maximum is not an area", () => {
  // `room_categories_area_max_pets` forbids the combination, and the trigger
  // returns without enforcing when it sees one. This stops counting pets for
  // the same reason: guessing a capacity is worse than counting rooms.
  const BROKEN = { spaceType: "area" as const, maxPetsPerArea: undefined };

  test("it falls back to counting rooms rather than inventing a capacity", () => {
    const o = lodgingOccupancy(BROKEN, UNITS, {
      occupiedUnitIds: new Set(["u1", "u2"]),
    });
    expect(o.countedIn).toBe("rooms");
    expect(o).toEqual({
      countedIn: "rooms",
      used: 2,
      capacity: 3,
      percent: 67,
    });
  });

  test("and a zero maximum is treated the same way, not as a full yard", () => {
    const o = lodgingOccupancy(
      { spaceType: "area", maxPetsPerArea: 0 },
      UNITS,
      {},
    );
    expect(o.countedIn).toBe("rooms");
    expect(o.capacity).toBe(3);
  });

  test("isCountedInPets says so directly", () => {
    expect(isCountedInPets(AREA)).toBe(true);
    expect(isCountedInPets(ROOM)).toBe(false);
    expect(isCountedInPets(BROKEN)).toBe(false);
    expect(isCountedInPets({ spaceType: undefined, maxPetsPerArea: 12 })).toBe(
      false,
    );
  });
});

describe("a category with no space type is a room", () => {
  // Every row that existed before Phase 1 is a room — that is what the
  // column's `not null default 'room'` says, and what the exclusion
  // constraint already assumed.
  test("undefined spaceType counts rooms", () => {
    const o = lodgingOccupancy(
      { spaceType: undefined, maxPetsPerArea: undefined },
      UNITS,
      { occupiedUnitIds: new Set(["u1"]) },
    );
    expect(o.countedIn).toBe("rooms");
    expect(o.capacity).toBe(3);
  });
});

describe("petsOnBooking — stays are not dogs", () => {
  // The operand trap again, and the reason `boardingUnitPets` exists beside
  // `getBoardingUnitUsage`: counting STAYS against `maxPetsPerArea` would let
  // a twelve-dog yard take twelve FAMILIES, and the trigger — which counts
  // `booking_pets` — would refuse the save after the screen promised it fit.
  test("a household bringing three dogs is three pets, not one booking", () => {
    expect(petsOnBooking({ petId: [1, 2, 3] })).toBe(3);
  });

  test("petIds wins where the read shape carries it", () => {
    expect(petsOnBooking({ petIds: [7, 8] })).toBe(2);
    // And it wins over a stale single `petId`.
    expect(petsOnBooking({ petId: 7, petIds: [7, 8] })).toBe(2);
  });

  test("one pet is the floor — a stay with none recorded is still somebody", () => {
    expect(petsOnBooking({ petId: 4 })).toBe(1);
    expect(petsOnBooking({})).toBe(1);
    expect(petsOnBooking({ petId: [] })).toBe(1);
    expect(petsOnBooking({ petIds: [] })).toBe(1);
  });
});

describe("nothing to count", () => {
  test("no units is zero percent, not NaN and not a division by zero", () => {
    expect(lodgingOccupancy(ROOM, [], {})).toEqual({
      countedIn: "rooms",
      used: 0,
      capacity: 0,
      percent: 0,
    });
    expect(lodgingOccupancy(AREA, [], {})).toEqual({
      countedIn: "pets",
      used: 0,
      capacity: 0,
      percent: 0,
    });
  });

  test("places left on nothing is zero, never negative", () => {
    expect(lodgingPlacesLeft(lodgingOccupancy(ROOM, [], {}))).toBe(0);
  });
});

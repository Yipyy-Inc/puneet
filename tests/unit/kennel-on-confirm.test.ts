import { describe, expect, test } from "bun:test";

import { kennelCandidates } from "@/lib/boarding/kennel-on-confirm";
import type { FacilityRoom, RoomCategory, RoomRule } from "@/types/rooms";

// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// A confirmed boarding request is given a kennel of the kind it was priced
// for: one of its rate's room types, a type clients may book, one whose rules
// admit every pet, and a kennel big enough for the household. These are the
// kennels it may be given, best first; the database decides which is free.

const type = (patch: Partial<RoomCategory>) =>
  ({
    service: "boarding",
    visibleToClients: true,
    rules: [],
    defaultCapacity: 1,
    sortOrder: 0,
    ...patch,
  }) as RoomCategory;
const kennel = (
  id: string,
  categoryId: string,
  patch: Partial<FacilityRoom> = {},
) => ({ id, categoryId, name: id, active: true, ...patch }) as FacilityRoom;
const dog = { type: "Dog", weight: 30 };
const rule = (patch: Partial<RoomRule>) =>
  ({ enabled: true, ...patch }) as RoomRule;

const suites = type({
  id: "cat-suite",
  rowId: "uuid-suite",
  name: "Suites",
  sortOrder: 1,
});
const condos = type({
  id: "cat-condo",
  rowId: "uuid-condo",
  name: "Condos",
  sortOrder: 2,
});
const units = [
  kennel("Suite 10", "cat-suite"),
  kennel("Suite 2", "cat-suite"),
  kennel("Condo 1", "cat-condo"),
];

const ids = (rooms: FacilityRoom[]) => rooms.map((r) => r.id);

describe("the kennels a confirmed request may be given", () => {
  test("only the rate's room types, named by rowId", () => {
    expect(
      ids(
        kennelCandidates({
          categories: [suites, condos],
          units,
          pets: [dog],
          lodgingTypeIds: ["uuid-condo"],
          clientsOnly: true,
        }),
      ),
    ).toEqual(["Condo 1"]);
  });

  test("no rate, or a rate naming no type: every type, in the facility's order", () => {
    for (const lodgingTypeIds of [null, []]) {
      expect(
        ids(
          kennelCandidates({
            categories: [condos, suites],
            units,
            pets: [dog],
            lodgingTypeIds,
            clientsOnly: true,
          }),
        ),
      ).toEqual(["Suite 2", "Suite 10", "Condo 1"]);
    }
  });

  test("a type clients may not book is left out of a customer's booking", () => {
    const staffOnly = type({ ...suites, visibleToClients: false });
    expect(
      ids(
        kennelCandidates({
          categories: [staffOnly, condos],
          units,
          pets: [dog],
          lodgingTypeIds: null,
          clientsOnly: true,
        }),
      ),
    ).toEqual(["Condo 1"]);
  });

  test("a type whose rules refuse a pet is left out — every pet must fit", () => {
    const small = type({
      ...suites,
      rules: [rule({ type: "max_weight", value: 20 })],
    });
    const dogsOnly = type({
      ...condos,
      rules: [rule({ type: "pet_type", value: "Dog" })],
    });
    expect(
      ids(
        kennelCandidates({
          categories: [small, dogsOnly],
          units,
          pets: [dog, { type: "Cat", weight: 8 }],
          lodgingTypeIds: null,
          clientsOnly: true,
        }),
      ),
    ).toEqual([]);
  });

  test("two dogs need a kennel that holds two; an inactive kennel is never offered", () => {
    const bigCondos = type({ ...condos, defaultCapacity: 2 });
    expect(
      ids(
        kennelCandidates({
          categories: [suites, bigCondos],
          units: [...units, kennel("Condo 2", "cat-condo", { active: false })],
          pets: [dog, dog],
          lodgingTypeIds: null,
          clientsOnly: true,
        }),
      ),
    ).toEqual(["Condo 1"]);
  });

  test("an area is offered while the household fits in it at all", () => {
    const yard = type({
      id: "cat-yard",
      rowId: "uuid-yard",
      name: "Yard",
      spaceType: "area",
      maxPetsPerArea: 2,
    });
    const pets = [dog, dog, dog];
    expect(
      ids(
        kennelCandidates({
          categories: [yard],
          units: [kennel("Yard", "cat-yard")],
          pets: pets.slice(0, 2),
          lodgingTypeIds: null,
          clientsOnly: true,
        }),
      ),
    ).toEqual(["Yard"]);
    expect(
      kennelCandidates({
        categories: [yard],
        units: [kennel("Yard", "cat-yard")],
        pets,
        lodgingTypeIds: null,
        clientsOnly: true,
      }),
    ).toEqual([]);
  });
});

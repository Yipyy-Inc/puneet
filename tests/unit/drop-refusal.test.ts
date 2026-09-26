import { describe, expect, test } from "bun:test";

import { dropRefusal } from "@/lib/boarding/drop-refusal";
import type { RoomCategory, RoomRule } from "@/types/rooms";

// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// The kennel board's drop rule, which answered a bare `false` and made the
// board ignore the drop without a word. It says why now, and a guest booked
// at one rate is refused a kennel of a type the rate does not book — unless
// the override is on, which passes everything, as it always has.

const suites = { id: "cat-suite", rules: [] as RoomRule[] } as RoomCategory;
const condos = { id: "cat-condo", rules: [] as RoomRule[] } as RoomCategory;
const suitesGuest = {
  eligible: true,
  petType: "dog",
  allowedCategoryIds: ["cat-suite"],
};
const open = {
  capacity: 1,
  assignedPetIds: [] as number[],
  allowOverride: false,
  takenByAnotherStay: false,
};

describe("dropping a guest on the kennel board", () => {
  test("a kennel of the rate's type: allowed", () => {
    expect(dropRefusal({ ...open, category: suites, pet: suitesGuest })).toBe(
      null,
    );
  });

  test("a kennel of another type: refused, and why", () => {
    expect(dropRefusal({ ...open, category: condos, pet: suitesGuest })).toBe(
      "rate",
    );
  });

  test("the override takes a guest anywhere", () => {
    expect(
      dropRefusal({
        ...open,
        category: condos,
        pet: suitesGuest,
        allowOverride: true,
      }),
    ).toBe(null);
  });

  test("a rate naming no type, or no rate at all: any type", () => {
    for (const allowedCategoryIds of [undefined, []]) {
      expect(
        dropRefusal({
          ...open,
          category: condos,
          pet: { eligible: true, petType: "dog", allowedCategoryIds },
        }),
      ).toBe(null);
    }
  });

  test("the other refusals keep their order, and now their names", () => {
    const catsOnly = {
      id: "cat-suite",
      rules: [{ enabled: true, type: "pet_type", value: "cat" } as RoomRule],
    } as RoomCategory;
    expect(
      dropRefusal({
        ...open,
        category: suites,
        pet: { ...suitesGuest, eligible: false },
      }),
    ).toBe("ineligible");
    expect(dropRefusal({ ...open, category: catsOnly, pet: suitesGuest })).toBe(
      "species",
    );
    expect(
      dropRefusal({
        ...open,
        category: suites,
        pet: suitesGuest,
        takenByAnotherStay: true,
      }),
    ).toBe("taken");
    expect(
      dropRefusal({
        ...open,
        category: suites,
        pet: suitesGuest,
        assignedPetIds: [7],
      }),
    ).toBe("full");
  });
});

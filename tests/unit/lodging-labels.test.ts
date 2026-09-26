import { describe, expect, test } from "bun:test";

import { lodgingLabels } from "@/lib/boarding/lodging-labels";
import type { FacilityRoom, RoomCategory } from "@/types/rooms";

// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// The Rates tab names the room types a rate books into. Two ways that went
// wrong: `lodging_type_ids` holds uuids (`rowId`) while `RoomCategory.id` is
// the legacy id, and both are strings, so the wrong one typechecks and names
// nothing; and a facility had two room types called "Suites" — one with 11
// live kennels, one whose 11 were all switched off — which by name alone read
// the same.

const category = (patch: Partial<RoomCategory>) =>
  ({ service: "boarding", rules: [], ...patch }) as RoomCategory;
const room = (categoryId: string, active = true) =>
  ({
    id: `${categoryId}-${Math.random()}`,
    categoryId,
    active,
  }) as FacilityRoom;
const kennels = (n: number) => `${n} kennels`;

describe("the room types a rate can book into", () => {
  test("keyed by rowId, with each type's active kennels counted", () => {
    expect(
      lodgingLabels(
        [
          category({ id: "cat-suite", rowId: "uuid-suite", name: "Suites" }),
          category({ id: "cat-condo", rowId: "uuid-condo", name: "Condos" }),
        ],
        [room("cat-suite"), room("cat-suite"), room("cat-suite", false)],
        kennels,
      ),
    ).toEqual([
      { id: "uuid-suite", label: "Suites · 2 kennels" },
      { id: "uuid-condo", label: "Condos · 0 kennels" },
    ]);
  });

  test("two types with one name are told apart by their kennels", () => {
    const [full, empty] = lodgingLabels(
      [
        category({ id: "cat-a", rowId: "uuid-a", name: "Suites" }),
        category({ id: "cat-b", rowId: "uuid-b", name: "Suites" }),
      ],
      Array.from({ length: 11 }, () => room("cat-a")),
      kennels,
    );
    expect(full!.label).toBe("Suites · 11 kennels");
    expect(empty!.label).toBe("Suites · 0 kennels");
  });

  test("a draft with no rowId and a daycare type are left out", () => {
    expect(
      lodgingLabels(
        [
          category({ id: "cat-draft", name: "Draft" }),
          category({
            id: "cat-yard",
            rowId: "uuid-yard",
            name: "Yard",
            service: "daycare",
          }),
        ],
        [],
        kennels,
      ),
    ).toEqual([]);
  });
});

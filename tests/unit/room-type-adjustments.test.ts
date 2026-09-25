import { describe, expect, test } from "bun:test";

import { applyDynamicPricingRules } from "@/lib/pricing-rules";
import { NO_PRICING_RULES, type PricingRules } from "@/lib/settings/pricing";
import type { RoomTypeAdjustment } from "@/types/boarding";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// A room-type rule is written against the facility's KENNEL CLASSES, and a
// booking's assignment may name a class or one room of it. Until 2026-09-25
// the editor offered four hard-coded types (`standard`, `deluxe`, `vip`,
// `cat-suite`) and the evaluator compared them with the assignment's raw id:
// three could never match, `cat-suite` matched the demo facility's plain Suite
// by coincidence, and a booking assigned to a room matched nothing at all.
//
// The ids below are the shapes real rows carry — a class `cat-<timestamp>`,
// a room `<class>-<n>` — so no test here agrees with itself by writing the
// same string on both sides.

const SUITES = "cat-1786136174939";
const CONDOS = "cat-1789260254917";
const SUITE_2 = "cat-1786136174939-2";
const CONDO_1 = "cat-1789260254917-1";

const ROOM_CLASS: Record<string, string> = {
  [SUITE_2]: SUITES,
  [CONDO_1]: CONDOS,
};

function rule(over: Partial<RoomTypeAdjustment> = {}): RoomTypeAdjustment {
  return {
    id: "rta-1",
    name: "Suite handling",
    roomTypeIds: [SUITES],
    minNights: null,
    maxNights: null,
    sameRoomRequired: false,
    adjustmentKind: "surcharge",
    adjustmentType: "flat",
    amount: 15,
    applicableServices: ["boarding"],
    isActive: true,
    ...over,
  } as RoomTypeAdjustment;
}

/** A facility with this one rule and nothing else configured. */
function rules(adjustment: RoomTypeAdjustment): PricingRules {
  return { ...NO_PRICING_RULES, roomTypeAdjustments: [adjustment] };
}

/** The room-type amount a stay is charged, for assignments of one pet each. */
function roomTypeCharge(
  adjustment: RoomTypeAdjustment,
  roomIds: string[],
  { resolve = true }: { resolve?: boolean } = {},
): number {
  const petIds = roomIds.map((_, i) => i + 1);
  const result = applyDynamicPricingRules({
    rules: rules(adjustment),
    serviceId: "boarding",
    basePrice: 100,
    existingExtraServices: [],
    selectedPetIds: petIds,
    pets: petIds.map((id) => ({ id })),
    addOnsCatalog: [],
    roomAssignments: roomIds.map((roomId, i) => ({ petId: i + 1, roomId })),
    boardingNights: 2,
    roomCategoryOf: resolve ? (roomId) => ROOM_CLASS[roomId] : undefined,
  });
  return result.adjustments
    .filter((a) => a.source === "room_type")
    .reduce((sum, a) => sum + a.amount, 0);
}

describe("a room-type rule is matched by the assignment's kennel class", () => {
  test("a booking that names the class is charged", () => {
    expect(roomTypeCharge(rule(), [SUITES])).toBe(15);
  });

  test("a booking that names a ROOM of the class is charged too", () => {
    expect(roomTypeCharge(rule(), [SUITE_2])).toBe(15);
  });

  test("NEGATIVE CONTROL: without the class lookup, a room matches nothing", () => {
    // What the evaluator did before 2026-09-25. If this starts charging, the
    // lookup is no longer what decides the match.
    expect(roomTypeCharge(rule(), [SUITE_2], { resolve: false })).toBe(0);
  });

  test("a booking in another class is not charged", () => {
    expect(roomTypeCharge(rule(), [CONDOS])).toBe(0);
    expect(roomTypeCharge(rule(), [CONDO_1])).toBe(0);
  });

  test("a discount written for the class is taken off, not added", () => {
    expect(
      roomTypeCharge(rule({ adjustmentKind: "discount" }), [SUITE_2]),
    ).toBe(-15);
  });

  test("'same room' holds when every pet shares one room of the class", () => {
    const same = rule({ sameRoomRequired: true });
    expect(roomTypeCharge(same, [SUITE_2, SUITE_2])).toBe(15);
    // Two different rooms is not the same room, whatever their class.
    expect(roomTypeCharge(same, [SUITE_2, SUITES])).toBe(0);
  });
});

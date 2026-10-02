import { describe, expect, test } from "bun:test";

import {
  cleanDimensions,
  cleanFeatures,
  loosestLimits,
  roomLimitsOf,
} from "@/lib/rooms/room-facts";
import type { RoomRule } from "@/types/rooms";

const rule = (
  type: RoomRule["type"],
  value: RoomRule["value"],
  enabled = true,
): RoomRule => ({ id: type, type, value, clientMessage: "", enabled });

describe("room facts", () => {
  test("size words are trimmed, and blank is none", () => {
    expect(cleanDimensions("  4 ×  4 ft ")).toBe("4 × 4 ft");
    expect(cleanDimensions("   ")).toBeNull();
    expect(cleanDimensions(12)).toBeNull();
    expect(cleanDimensions("x".repeat(80))).toHaveLength(60);
  });

  test("chips: no blanks, no repeats, eight at most", () => {
    expect(
      cleanFeatures(["Webcam", " webcam", "", "Raised  bed", 3, null]),
    ).toEqual(["Webcam", "Raised bed"]);
    expect(
      cleanFeatures(Array.from({ length: 12 }, (_, i) => `Chip ${i}`)),
    ).toHaveLength(8);
    expect(cleanFeatures("Webcam")).toEqual([]);
  });

  test("the limits are the rules the engine enforces, disabled ones aside", () => {
    expect(
      roomLimitsOf([
        rule("max_weight", 25),
        rule("min_weight", 10, false),
        rule("pet_type", ["Dog"]),
      ]),
    ).toEqual({ weight: { minLb: undefined, maxLb: 25 }, species: ["Dog"] });
  });

  test("a card booking into several types shows the loosest limit", () => {
    expect(
      loosestLimits([
        { weight: { maxLb: 25 }, species: ["Dog"] },
        { weight: { maxLb: 60 }, species: ["Dog", "Cat"] },
      ]),
    ).toEqual({
      weight: { minLb: undefined, maxLb: 60 },
      species: ["Dog", "Cat"],
    });
    // One type with no limit is no limit on the card.
    expect(
      loosestLimits([
        { weight: { maxLb: 25 }, species: ["Dog"] },
        { weight: {}, species: null },
      ]),
    ).toEqual({
      weight: { minLb: undefined, maxLb: undefined },
      species: null,
    });
  });
});

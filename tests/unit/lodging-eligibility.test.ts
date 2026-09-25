import { describe, expect, test } from "bun:test";

import { formatWeightRangeFromLb } from "@/lib/i18n/format";
import {
  limitsConflict,
  speciesOptions,
  speciesWithin,
  tiersWithin,
  toggledSpecies,
  toggledTier,
  weightBands,
  weightLimitsOf,
  withWeightLimits,
  withWeightMessage,
} from "@/lib/rooms/lodging-eligibility";
import type { RoomRule } from "@/types/rooms";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// The Rooms page's size and species pickers, which write onto the three rules
// the engine reads. The cases that matter are the live ones: a limit that is
// not a tier edge (Doggieville's Condos, up to 20 lb) must survive being
// shown, and pressing a chip must always leave a range a pet can fall in.

const rule = (
  type: RoomRule["type"],
  value: RoomRule["value"],
  extra: Partial<RoomRule> = {},
): RoomRule => ({
  id: `r-${type}`,
  type,
  value,
  clientMessage: "",
  enabled: true,
  ...extra,
});

describe("size tiers over a weight range", () => {
  test("the tiers are boarding's bands, each above the one below", () => {
    expect(weightBands()).toEqual([
      { id: "small", fromLb: undefined, toLb: 15 },
      { id: "medium", fromLb: 15, toLb: 35 },
      { id: "large", fromLb: 35, toLb: 70 },
      { id: "giant", fromLb: 70, toLb: undefined },
    ]);
  });

  test("no limit is every tier", () => {
    expect(tiersWithin({})).toEqual(["small", "medium", "large", "giant"]);
  });

  test("a limit that is not a tier edge shows only the tiers wholly inside", () => {
    expect(tiersWithin({ maxLb: 20 })).toEqual(["small"]);
    expect(tiersWithin({ minLb: 40 })).toEqual(["giant"]);
    expect(tiersWithin({ minLb: 20, maxLb: 30 })).toEqual([]);
    expect(tiersWithin({ minLb: 15, maxLb: 70 })).toEqual(["medium", "large"]);
  });

  test("two limits of one kind mean the stricter, as the engine reads them", () => {
    expect(
      weightLimitsOf([
        rule("min_weight", 20),
        { ...rule("min_weight", 40), id: "r-2" },
        rule("max_weight", 90, { enabled: false }),
      ]),
    ).toEqual({ minLb: 40, maxLb: undefined });
  });

  test("pressing an end of the run drops it; pressing past it stretches it", () => {
    expect(toggledTier({}, "small")).toEqual({ minLb: 15, maxLb: undefined });
    expect(toggledTier({}, "giant")).toEqual({ minLb: undefined, maxLb: 70 });
    expect(toggledTier({ maxLb: 15 }, "large")).toEqual({
      minLb: undefined,
      maxLb: 70,
    });
  });

  test("pressing the middle of a run keeps only that tier", () => {
    expect(toggledTier({}, "medium")).toEqual({ minLb: 15, maxLb: 35 });
  });

  test("dropping the last tier is no limit, never a class that takes no pet", () => {
    expect(toggledTier({ maxLb: 15 }, "small")).toEqual({});
  });

  test("a custom range that covers no tier starts again from the one pressed", () => {
    expect(toggledTier({ minLb: 20, maxLb: 30 }, "medium")).toEqual({
      minLb: 15,
      maxLb: 35,
    });
  });

  test("a lowest weight above the highest is caught", () => {
    expect(limitsConflict({ minLb: 50, maxLb: 20 })).toBe(true);
    expect(limitsConflict({ minLb: 20, maxLb: 20 })).toBe(false);
    expect(limitsConflict({ minLb: 50 })).toBe(false);
  });
});

describe("writing the range back onto the rules", () => {
  test("a limit keeps its id and its message, and a new one borrows the message", () => {
    const rules = [
      rule("pet_type", "dog"),
      rule("max_weight", 60, { id: "rule-c-1", clientMessage: "Up to 60 lb." }),
    ];
    const next = withWeightLimits(rules, { minLb: 15, maxLb: 35 });
    expect(next).toEqual([
      rule("pet_type", "dog"),
      {
        id: "rule-min_weight",
        type: "min_weight",
        value: 15,
        clientMessage: "Up to 60 lb.",
        enabled: true,
      },
      {
        id: "rule-c-1",
        type: "max_weight",
        value: 35,
        clientMessage: "Up to 60 lb.",
        enabled: true,
      },
    ]);
  });

  test("no limit removes the weight rules, a switched-off one included", () => {
    const rules = [
      rule("max_weight", 60, { enabled: false }),
      rule("pet_type", "dog"),
    ];
    expect(withWeightLimits(rules, {})).toEqual([rule("pet_type", "dog")]);
  });

  test("one message is written to both limits", () => {
    const rules = withWeightMessage(
      [rule("min_weight", 15), rule("max_weight", 35), rule("pet_type", "dog")],
      "Medium dogs only.",
    );
    expect(rules.map((r) => r.clientMessage)).toEqual([
      "Medium dogs only.",
      "Medium dogs only.",
      "",
    ]);
  });
});

describe("species chips", () => {
  const facility = ["Dog", "Cat"];

  test("a species the class names but the facility dropped is still offered", () => {
    expect(speciesOptions(facility, [rule("pet_type", ["Ferret"])])).toEqual([
      "Dog",
      "Cat",
      "Ferret",
    ]);
  });

  test("no rule is every species, and a rule names the ones it takes", () => {
    expect(speciesWithin(facility, [])).toEqual(["Dog", "Cat"]);
    expect(speciesWithin(facility, [rule("pet_type", "dog")])).toEqual(["Dog"]);
  });

  test("turning one off writes the rest, and turning it back on removes the rule", () => {
    const dogsOnly = toggledSpecies(facility, [], "Cat");
    expect(dogsOnly).toEqual([
      {
        id: "rule-pet_type",
        type: "pet_type",
        value: ["Dog"],
        clientMessage: "",
        enabled: true,
      },
    ]);
    expect(toggledSpecies(facility, dogsOnly, "Cat")).toEqual([]);
  });

  test("turning off the last one is no restriction, not a class nobody can use", () => {
    expect(toggledSpecies(facility, [rule("pet_type", "Dog")], "Dog")).toEqual(
      [],
    );
  });
});

describe("a band of weights, formatted", () => {
  test("metric leads, one decimal below 20 kg (§5q)", () => {
    expect(formatWeightRangeFromLb(15, 35, "en")).toBe(
      "6.8–15.9 kg (15–35 lb)",
    );
    expect(formatWeightRangeFromLb(35, 70, "en")).toBe("15.9–32 kg (35–70 lb)");
    expect(formatWeightRangeFromLb(15, 35, "fr")).toBe(
      "6,8–15,9 kg (15–35 lb)",
    );
  });
});

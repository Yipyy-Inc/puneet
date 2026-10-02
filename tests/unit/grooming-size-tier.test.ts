import { describe, expect, test } from "bun:test";

import { groomingSizeFor, parseSizeTiers } from "@/lib/grooming/size-tier";

// `create_booking`'s rule (20260915104919): the first band by its limit, the
// open-ended one last, whose limit the weight is within — inclusive.
const FACILITY = [
  { id: "small", label: "Small", maxWeightLbs: 15 },
  { id: "medium", label: "Medium", maxWeightLbs: 35 },
  { id: "large", label: "Large", maxWeightLbs: 70 },
  { id: "giant", label: "Giant" },
];

describe("groomingSizeFor", () => {
  test("the facility's bands, limits inclusive", () => {
    expect(groomingSizeFor(10, FACILITY)).toBe("small");
    expect(groomingSizeFor(15, FACILITY)).toBe("small");
    // The 17 lb dog the wizard quoted Small (20/40/80) and the database booked Medium.
    expect(groomingSizeFor(17, FACILITY)).toBe("medium");
    expect(groomingSizeFor(70, FACILITY)).toBe("large");
    expect(groomingSizeFor(71, FACILITY)).toBe("giant");
  });

  test("the bands' order does not matter, the open-ended one is last", () => {
    expect(groomingSizeFor(200, [...FACILITY].reverse())).toBe("giant");
    expect(groomingSizeFor(30, [...FACILITY].reverse())).toBe("medium");
  });

  test("no weight, or no bands, is no size — base price and length", () => {
    expect(groomingSizeFor(null, FACILITY)).toBeNull();
    expect(groomingSizeFor(undefined, FACILITY)).toBeNull();
    expect(groomingSizeFor(20, [])).toBeNull();
  });

  test("the stored shape is read tolerantly", () => {
    expect(
      parseSizeTiers([
        { id: "small", maxWeightLbs: "15" },
        { id: "giant", label: "Giant", maxWeightLbs: null },
        { label: "no id" },
        "nonsense",
      ]),
    ).toEqual([
      { id: "small", label: null, maxWeightLbs: 15 },
      { id: "giant", label: "Giant", maxWeightLbs: null },
    ]);
    expect(parseSizeTiers(null)).toEqual([]);
  });
});

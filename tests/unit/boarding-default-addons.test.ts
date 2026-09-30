import { describe, expect, test } from "bun:test";

import {
  daysCovered,
  defaultAddOnLines,
  type BoardingDefaultAddOn,
} from "@/lib/pricing/boarding-default-addons";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// How a stay's length becomes the add-ons its service attaches. Tuesday in,
// Friday out: three nights, four days. The quantities here are what the
// booking form, the customer's quote and the server's re-price all read, so a
// day counted differently in one of them is a price the others refuse.

const WALK_ROW = "11111111-1111-4111-8111-111111111111";

/** An add-on as a booking reads it; `ref` is what a line is written under. */
const addOn = (
  patch: Partial<{ ref: string; rowId: string; isActive: boolean }> = {},
) => ({
  ref: "walk",
  rowId: WALK_ROW,
  isActive: true,
  ...patch,
});

const rule = (
  patch: Partial<BoardingDefaultAddOn> = {},
): BoardingDefaultAddOn => ({
  addOnId: "walk",
  appliesOn: "every_day",
  quantityPerDay: 1,
  minNights: null,
  ...patch,
});

describe("the days of a three-night stay", () => {
  test("every day is four, the days either side of a stay three, the last one", () => {
    expect(daysCovered("every_day", 3)).toBe(4);
    expect(daysCovered("except_checkout", 3)).toBe(3);
    expect(daysCovered("except_checkin", 3)).toBe(3);
    expect(daysCovered("last_day", 3)).toBe(1);
  });

  test("a stay with no nights covers nothing", () => {
    expect(daysCovered("every_day", 0)).toBe(0);
    expect(daysCovered("last_day", Number.NaN)).toBe(0);
  });
});

describe("the add-on lines a stay gets", () => {
  test("two walks a day, every day, for each of two dogs", () => {
    expect(
      defaultAddOnLines({
        defaults: [rule({ quantityPerDay: 2 })],
        nights: 3,
        petIds: [1, 2],
        catalogue: [addOn()],
      }),
    ).toEqual([
      { serviceId: "walk", quantity: 8, petId: 1 },
      { serviceId: "walk", quantity: 8, petId: 2 },
    ]);
  });

  test("once the stay is long enough, and not before", () => {
    const defaults = [rule({ appliesOn: "last_day", minNights: 5 })];
    const catalogue = [addOn()];
    expect(
      defaultAddOnLines({ defaults, nights: 4, petIds: [1], catalogue }),
    ).toEqual([]);
    expect(
      defaultAddOnLines({ defaults, nights: 5, petIds: [1], catalogue }),
    ).toEqual([{ serviceId: "walk", quantity: 1, petId: 1 }]);
  });

  // A rule may name its add-on by the row's uuid (what the API hands out)
  // while a booking line names it by its ref — the id it had before the one
  // list. The line has to be written under the ref, or the same add-on chosen
  // by hand is a second line and an edit re-prices it.
  test("a rule that names the row's uuid writes the line under the add-on's ref", () => {
    expect(
      defaultAddOnLines({
        defaults: [rule({ addOnId: WALK_ROW, appliesOn: "last_day" })],
        nights: 2,
        petIds: [1],
        catalogue: [addOn()],
      }),
    ).toEqual([{ serviceId: "walk", quantity: 1, petId: 1 }]);
  });

  test("an add-on with no old id is named by its row's uuid everywhere", () => {
    expect(
      defaultAddOnLines({
        defaults: [rule({ addOnId: WALK_ROW, appliesOn: "last_day" })],
        nights: 2,
        petIds: [1],
        catalogue: [addOn({ ref: WALK_ROW })],
      }),
    ).toEqual([{ serviceId: WALK_ROW, quantity: 1, petId: 1 }]);
  });

  test("an add-on removed or switched off attaches nothing", () => {
    const input = { defaults: [rule()], nights: 3, petIds: [1] };
    expect(defaultAddOnLines({ ...input, catalogue: [] })).toEqual([]);
    expect(
      defaultAddOnLines({ ...input, catalogue: [addOn({ isActive: false })] }),
    ).toEqual([]);
  });
});

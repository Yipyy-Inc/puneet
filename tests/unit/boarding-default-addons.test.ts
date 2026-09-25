import { describe, expect, test } from "bun:test";

import {
  daysCovered,
  defaultAddOnLines,
  type BoardingDefaultAddOn,
} from "@/lib/pricing/boarding-default-addons";
import type { ServiceAddOn } from "@/types/facility";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// How a stay's length becomes the add-ons its service attaches. Tuesday in,
// Friday out: three nights, four days. The quantities here are what the
// booking form, the customer's quote and the server's re-price all read, so a
// day counted differently in one of them is a price the others refuse.

const addOn = (patch: Partial<ServiceAddOn> = {}): ServiceAddOn =>
  ({
    id: "walk",
    name: "Daily walk",
    price: 8,
    pricingType: "per_day",
    isActive: true,
    applicableServices: ["boarding"],
    ...patch,
  }) as ServiceAddOn;

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
    const catalogue = [addOn({ id: "walk", name: "Bath" })];
    expect(
      defaultAddOnLines({ defaults, nights: 4, petIds: [1], catalogue }),
    ).toEqual([]);
    expect(
      defaultAddOnLines({ defaults, nights: 5, petIds: [1], catalogue }),
    ).toEqual([{ serviceId: "walk", quantity: 1, petId: 1 }]);
  });

  test("a per-booking add-on is attached once, whatever the number of dogs", () => {
    expect(
      defaultAddOnLines({
        defaults: [rule({ appliesOn: "last_day" })],
        nights: 2,
        petIds: [1, 2, 3],
        catalogue: [addOn({ petScope: "per_booking" })],
      }),
    ).toEqual([{ serviceId: "walk", quantity: 1, petId: 1 }]);
  });

  test("an add-on removed, switched off or priced as a percentage attaches nothing", () => {
    const input = { defaults: [rule()], nights: 3, petIds: [1] };
    expect(defaultAddOnLines({ ...input, catalogue: [] })).toEqual([]);
    expect(
      defaultAddOnLines({ ...input, catalogue: [addOn({ isActive: false })] }),
    ).toEqual([]);
    expect(
      defaultAddOnLines({
        ...input,
        catalogue: [addOn({ pricingType: "percentage_of_booking" })],
      }),
    ).toEqual([]);
  });
});

import { describe, expect, test } from "bun:test";

import {
  addOnLine,
  stayDaysFor,
  takesQuantity,
} from "@/lib/yipyy-go/charges-preview";

// The estimate an owner sees while choosing add-ons. It mirrors
// private.yipyy_go_stay_days and private.yipyy_go_price_add_on
// (20260913135000); an estimate that disagreed with them would promise one
// figure and bill another.

describe("the days a per-day charge counts", () => {
  test("boarding counts nights, and a same-day stay is one", () => {
    expect(stayDaysFor("boarding", "2026-09-18", "2026-09-21")).toBe(3);
    expect(stayDaysFor("boarding", "2026-09-18", "2026-09-18")).toBe(1);
  });

  test("everything else counts the days it spans", () => {
    expect(stayDaysFor("daycare", "2026-09-18", "2026-09-18")).toBe(1);
    expect(stayDaysFor("training", "2026-09-18", "2026-09-20")).toBe(3);
  });

  test("a month or a daylight-saving change does not move the count", () => {
    expect(stayDaysFor("boarding", "2026-10-30", "2026-11-02")).toBe(3);
    expect(stayDaysFor("daycare", "2026-02-27", "2026-03-02")).toBe(4);
  });
});

describe("one add-on on the bill", () => {
  const offer = (pricingType: string, unitPrice = 12, maxQuantity = 10) => ({
    pricingType,
    unitPrice,
    maxQuantity,
  });

  test("a flat or percentage add-on is one, whatever is asked", () => {
    expect(addOnLine(offer("flat"), 5, 3)).toEqual({
      unitPrice: 12,
      quantity: 1,
      total: 12,
    });
    expect(addOnLine(offer("percentage_of_booking", 6.4), 3, 3).quantity).toBe(
      1,
    );
  });

  test("a per-day add-on is the count asked for, every day of the stay", () => {
    expect(addOnLine(offer("per_day", 7.5), 2, 3)).toEqual({
      unitPrice: 7.5,
      quantity: 6,
      total: 45,
    });
  });

  test("the count is held to the add-on's own maximum, and at least one", () => {
    expect(addOnLine(offer("per_item", 3, 10), 12, 1).quantity).toBe(10);
    expect(addOnLine(offer("per_session"), 0, 1).quantity).toBe(1);
    expect(addOnLine(offer("per_hour"), Number.NaN, 1).quantity).toBe(1);
  });

  test("an owner picks a count only where there is more than one to pick", () => {
    expect(takesQuantity(offer("per_item", 3, 10))).toBe(true);
    expect(takesQuantity(offer("per_item", 3, 1))).toBe(false);
    expect(takesQuantity(offer("flat"))).toBe(false);
    expect(takesQuantity(offer("percentage_of_booking"))).toBe(false);
  });
});

import { describe, expect, test } from "bun:test";

import { tipStillToCollect } from "@/lib/payments/pledged-tip";

// The tip a checkout starts at. Too little and an owner's pledge is lost at
// the counter; too much and a tip already paid is asked for again.

describe("the tip still to collect", () => {
  test("is the tip the booking carries while nothing has been collected", () => {
    expect(tipStillToCollect(10, 0)).toBe(10);
    expect(tipStillToCollect(10, undefined)).toBe(10);
  });

  test("is gone once a payment has collected it, or more", () => {
    expect(tipStillToCollect(10, 10)).toBe(0);
    expect(tipStillToCollect(10, 12.5)).toBe(0);
    expect(tipStillToCollect(10, 4)).toBe(6);
  });

  test("is nothing when the booking carries no tip", () => {
    expect(tipStillToCollect(null, 0)).toBe(0);
    expect(tipStillToCollect(undefined, undefined)).toBe(0);
    expect(tipStillToCollect(0, 0)).toBe(0);
  });

  test("a refund never raises it above the pledge", () => {
    expect(tipStillToCollect(10, -5)).toBe(10);
  });

  test("an unreadable figure offers nothing rather than a tip that may be paid", () => {
    expect(tipStillToCollect(10, Number.POSITIVE_INFINITY)).toBe(0);
    expect(tipStillToCollect(Number.NaN, 0)).toBe(0);
  });

  test("cents do not drift", () => {
    expect(tipStillToCollect(10.1, 0.1)).toBe(10);
  });
});

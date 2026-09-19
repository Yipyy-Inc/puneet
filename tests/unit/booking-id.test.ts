import { describe, expect, test } from "bun:test";

import { bookingRefCandidates, formatBookingRef } from "@/lib/booking-id";

describe("bookingRefCandidates", () => {
  test("the displayed number finds the ref it was made from", () => {
    expect(bookingRefCandidates(formatBookingRef(896))).toEqual([896, 10896]);
    expect(bookingRefCandidates("10896")).toEqual([896, 10896]);
  });
  test("a small number is the ref itself", () => {
    expect(bookingRefCandidates("896")).toEqual([896]);
    expect(bookingRefCandidates("#896")).toEqual([896]);
  });
  test("a large raw ref is still tried as itself", () => {
    expect(bookingRefCandidates("990011196")).toContain(990011196);
  });
  test("anything else is no booking", () => {
    for (const bad of ["", "abc", "#", "-5", "0", "12.5", "#10 896"]) {
      expect(bookingRefCandidates(bad)).toEqual([]);
    }
  });
});

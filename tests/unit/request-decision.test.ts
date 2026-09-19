import { describe, expect, test } from "bun:test";

import {
  approvalRefusal,
  groupRequests,
  quotedPrice,
  quotedTotal,
  statusFor,
} from "@/lib/bookings/request-decision";

// ============================================================================
// A REQUEST IS NOT APPROVED AT $0 BY ACCIDENT.
//
// The database zeroes a customer's price and keeps the form's quote aside, so
// every request arrives at $0 — and approving one as it stood made a booking
// the facility was paid nothing for. These pin when that is refused, what
// "approve at the quoted price" writes, and that a request's days are one
// decision.
// ============================================================================

const quote = { basePrice: 64, discount: 4, totalCost: 60 };

describe("approvalRefusal", () => {
  test("an unpriced request that was quoted is refused", () => {
    expect(
      approvalRefusal(
        { requestedQuote: quote, totalCost: 0, basePrice: 0 },
        false,
      ),
    ).toBe("unpriced");
  });

  test("approving at the quote is allowed", () => {
    expect(
      approvalRefusal(
        { requestedQuote: quote, totalCost: 0, basePrice: 0 },
        true,
      ),
    ).toBeNull();
  });

  test("a request staff priced is allowed", () => {
    expect(
      approvalRefusal(
        { requestedQuote: quote, totalCost: 55, basePrice: 55 },
        false,
      ),
    ).toBeNull();
  });

  test("a comp — full discount on a real base price — is allowed", () => {
    expect(
      approvalRefusal(
        { requestedQuote: quote, totalCost: 0, basePrice: 60 },
        false,
      ),
    ).toBeNull();
  });

  test("a request whose form quoted nothing is allowed", () => {
    expect(approvalRefusal({ totalCost: 0, basePrice: 0 }, false)).toBeNull();
  });
});

describe("the quoted price", () => {
  test("is the form's total, with its base and discount", () => {
    expect(quotedTotal({ requestedQuote: quote })).toBe(60);
    expect(quotedPrice({ requestedQuote: quote })).toEqual(quote);
  });

  test("no quote is no price", () => {
    expect(quotedTotal({})).toBeNull();
    expect(quotedTotal({ requestedQuote: { totalCost: 0 } })).toBeNull();
  });
});

test("each action names its status", () => {
  expect(statusFor("approve")).toBe("confirmed");
  expect(statusFor("decline")).toBe("declined");
  expect(statusFor("waitlist")).toBe("waitlisted");
});

describe("groupRequests", () => {
  test("a request's days are one entry, in date order", () => {
    const group = { id: "g1", part: 1, of: 2 };
    const groups = groupRequests([
      { id: 3, startDate: "2026-10-08", bookingGroup: { ...group, part: 2 } },
      { id: 9, startDate: "2026-10-01" },
      { id: 2, startDate: "2026-10-07", bookingGroup: group },
    ]);
    expect(groups.map((g) => g.map((b) => b.id))).toEqual([[2, 3], [9]]);
  });
});

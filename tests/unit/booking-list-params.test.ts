import { describe, expect, test } from "bun:test";

import {
  MAX_BOOKING_LIST_LIMIT,
  bookingListSearch,
  parseBookingListParams,
  shiftDay,
} from "@/lib/api/booking-list-params";

describe("bookingListSearch", () => {
  test("nothing narrowing the list is no query string at all", () => {
    expect(bookingListSearch()).toBe("");
    expect(bookingListSearch({ statuses: [] })).toBe("");
  });

  test("a window and statuses round-trip through the route's parser", () => {
    const search = bookingListSearch({
      from: "2026-09-14",
      to: "2026-09-20",
      statuses: ["waitlisted", "request_submitted"],
    });
    expect(parseBookingListParams(new URLSearchParams(search))).toEqual({
      ref: undefined,
      clientRef: undefined,
      from: "2026-09-14",
      to: "2026-09-20",
      statuses: ["request_submitted", "waitlisted"],
      limit: undefined,
    });
  });

  test("the limit is clamped to the route's ceiling", () => {
    expect(bookingListSearch({ limit: 50_000 })).toBe(
      `?limit=${MAX_BOOKING_LIST_LIMIT}`,
    );
  });
});

describe("parseBookingListParams", () => {
  test("anything malformed is dropped rather than guessed", () => {
    expect(
      parseBookingListParams(
        new URLSearchParams(
          "ref=-4&clientRef=abc&from=14/09/2026&to=2026-9-1&statuses=cancelled;drop&limit=0",
        ),
      ),
    ).toEqual({
      ref: undefined,
      clientRef: undefined,
      from: undefined,
      to: undefined,
      statuses: undefined,
      limit: undefined,
    });
  });

  test("a ref and a client ref are read as numbers", () => {
    const parsed = parseBookingListParams(
      new URLSearchParams("ref=62883&clientRef=15"),
    );
    expect(parsed.ref).toBe(62883);
    expect(parsed.clientRef).toBe(15);
  });
});

test("shiftDay crosses a month in UTC, whatever the machine's zone", () => {
  expect(shiftDay("2026-09-01", -1)).toBe("2026-08-31");
  expect(shiftDay("2026-09-14", -30)).toBe("2026-08-15");
});

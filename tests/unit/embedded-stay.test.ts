import { describe, expect, test } from "bun:test";

import { embeddedStay } from "@/lib/api/mappers/boarding-arrival";

// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// PostgREST embeds a booking's stay as ONE object while `boarding_stays` is
// keyed by `booking_id`, and as a LIST once a booking can hold several stays.
// A reader that expects the other shape reads `undefined` on every row — an
// empty board with no error — so the two boarding readers take either, and
// must keep doing so before the key changes.

const stay = { room_id: "r1", checked_in_at: "2026-09-25T15:00:00Z" };

describe("a booking's embedded stay", () => {
  test("an object is the stay", () => {
    expect(embeddedStay(stay)).toBe(stay);
  });

  test("a list gives its first stay", () => {
    const later = { room_id: "r2", checked_in_at: null };
    expect(embeddedStay([stay, later])).toBe(stay);
  });

  test("nothing, or an empty list, is no stay", () => {
    expect(embeddedStay(null)).toBeNull();
    expect(embeddedStay(undefined)).toBeNull();
    expect(embeddedStay([])).toBeNull();
  });
});

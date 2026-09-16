import { describe, expect, test } from "bun:test";

import {
  BOOKING_STATUS_IDS,
  CLOSED_BOOKING_STATUSES,
  OPEN_BOOKING_STATUSES,
} from "@/lib/settings/booking-statuses";

// ============================================================================
// Open and closed must PARTITION the status enum.
//
// Worth isolating because the failure is silent in both directions and neither
// shows up on a screen. A status missing from both lists is a booking a board
// asks the server not to send and then never notices is gone; a status in both
// is a row fetched and immediately dropped. The occupancy board asks the server
// for OPEN and then filters the answer by CLOSED, so the two lists being exact
// complements is what makes that safe — see booking-statuses.ts.
// ============================================================================

describe("open / closed booking statuses", () => {
  test("every status is in exactly one list", () => {
    for (const id of BOOKING_STATUS_IDS) {
      const closed = (CLOSED_BOOKING_STATUSES as readonly string[]).includes(
        id,
      );
      const open = OPEN_BOOKING_STATUSES.includes(id);
      // Not `toBe(!closed)`: that passes when both are false, which is the
      // case that loses a status from every board at once.
      expect([closed, open]).toEqual(closed ? [true, false] : [false, true]);
    }
  });

  test("together they are the whole enum, and nothing else", () => {
    expect(
      [...CLOSED_BOOKING_STATUSES, ...OPEN_BOOKING_STATUSES].sort(),
    ).toEqual([...BOOKING_STATUS_IDS].sort());
  });

  test("the four endings are the closed ones", () => {
    expect([...CLOSED_BOOKING_STATUSES].sort()).toEqual([
      "cancelled",
      "completed",
      "declined",
      "no_show",
    ]);
  });

  test("a booking somebody is still waiting for is open", () => {
    // The ones a board must draw. Named rather than derived, so a change to
    // the enum that quietly reclassifies one of these has to come past here.
    const stillWaiting: (typeof BOOKING_STATUS_IDS)[number][] = [
      "pending",
      "confirmed",
      "checked_in",
      "in_progress",
      "ready",
      "waitlisted",
      "request_submitted",
      "estimate_sent",
    ];
    for (const id of stillWaiting) {
      expect(OPEN_BOOKING_STATUSES).toContain(id);
    }
  });

  test("neither list is empty", () => {
    // A `.filter()` that matched everything would leave one side empty and a
    // screen asking for `statuses: []`, which the route answers with nothing.
    expect(OPEN_BOOKING_STATUSES.length).toBeGreaterThan(0);
    expect(CLOSED_BOOKING_STATUSES.length).toBeGreaterThan(0);
  });
});

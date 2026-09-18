import { describe, expect, test } from "bun:test";

import {
  autoTransitionTarget,
  DEFAULT_BOOKING_STATUS_RULES,
  type BookingStatusRules,
} from "@/lib/settings/booking-statuses";

// ============================================================================
// WHERE A FACILITY'S RULES TAKE A BOOKING AFTER A CHECK-IN.
//
// The booking page resolved this inline and the calendar did not resolve it
// at all, so the same press ended on two different statuses depending on the
// screen. One function now, for both.
// ============================================================================

const rules = (over: Partial<BookingStatusRules>): BookingStatusRules => ({
  ...DEFAULT_BOOKING_STATUS_RULES,
  ...over,
});

describe("autoTransitionTarget", () => {
  test("a per-service rule wins over the default", () => {
    expect(
      autoTransitionTarget(
        DEFAULT_BOOKING_STATUS_RULES,
        { service: "Grooming", status: "confirmed" },
        "onCheckIn",
      ),
    ).toBe("in_progress");
  });
  test("any other service takes the default", () => {
    expect(
      autoTransitionTarget(
        DEFAULT_BOOKING_STATUS_RULES,
        { service: "daycare", status: "confirmed" },
        "onCheckIn",
      ),
    ).toBe("checked_in");
  });
  test("a disabled rule is passed over", () => {
    const off = rules({
      iftttTransitionRules: [
        {
          ...DEFAULT_BOOKING_STATUS_RULES.iftttTransitionRules[0],
          enabled: false,
        },
      ],
    });
    expect(
      autoTransitionTarget(
        off,
        { service: "grooming", status: "confirmed" },
        "onCheckIn",
      ),
    ).toBe("checked_in");
  });
  test("a rule for another status is passed over", () => {
    const only = rules({
      iftttTransitionRules: [
        {
          ...DEFAULT_BOOKING_STATUS_RULES.iftttTransitionRules[0],
          currentStatus: "pending",
        },
      ],
    });
    expect(
      autoTransitionTarget(
        only,
        { service: "grooming", status: "confirmed" },
        "onCheckIn",
      ),
    ).toBe("checked_in");
  });
  test("a custom status or none moves nothing", () => {
    const custom = rules({
      autoTransitions: {
        ...DEFAULT_BOOKING_STATUS_RULES.autoTransitions,
        onCheckIn: "custom-bath-time",
      },
      iftttTransitionRules: [],
    });
    expect(
      autoTransitionTarget(
        custom,
        { service: "daycare", status: "confirmed" },
        "onCheckIn",
      ),
    ).toBeNull();
    expect(
      autoTransitionTarget(
        DEFAULT_BOOKING_STATUS_RULES,
        { service: "daycare", status: "completed" },
        "onPaymentComplete",
      ),
    ).toBeNull();
  });
});

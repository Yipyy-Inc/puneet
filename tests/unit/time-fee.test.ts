import { describe, expect, test } from "bun:test";

import { computeTimeFees, timeFeesTotal } from "@/lib/policies/time-fee";
import { applyDynamicPricingRules } from "@/lib/pricing-rules";
import { facilityHoursForDate } from "@/lib/settings/facility-hours";
import type { LatePickupFee } from "@/types/boarding";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// The till used to decide time fees with its own evaluator, which skipped
// every early-drop-off rule, matched no service when the editor wrote the
// `["all"]` sentinel, and never read `basedOn`, `customTime` or the
// apply-window at all. Each of those is a test below, and each one FAILS
// against the code that shipped before 2026-09-21.
//
// The rest pin arithmetic that is easy to get quietly wrong: a stay that runs
// past midnight, a `Z`-suffixed timestamp read against a local closing time,
// and two overlapping rules where the old code charged the sum.

function fee(overrides: Partial<LatePickupFee> = {}): LatePickupFee {
  return {
    id: "rule-1",
    name: "Late pickup",
    enabled: true,
    condition: "late_pickup",
    graceMinutes: 0,
    feeType: "per_hour",
    amount: 10,
    scope: "per_booking",
    basedOn: "custom_time",
    customTime: "18:00",
    ...overrides,
  };
}

describe("a fee scoped to every service", () => {
  // The editor's "All services" writes `["all"]`. The till did a plain
  // `.includes(serviceId)`, so the one scope a facility is most likely to
  // pick matched nothing and charged nobody.
  test("the `all` sentinel matches a service by name", () => {
    const fees = computeTimeFees({
      fees: [fee({ applicableServices: ["all"] })],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T19:00:00",
    });
    expect(fees).toHaveLength(1);
    expect(fees[0].amount).toBe(10);
  });

  test("an empty list means every service, not no service", () => {
    const fees = computeTimeFees({
      fees: [fee({ applicableServices: [] })],
      serviceId: "daycare",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T19:00:00",
    });
    expect(fees).toHaveLength(1);
  });

  test("a named list still excludes the services it does not name", () => {
    const fees = computeTimeFees({
      fees: [fee({ applicableServices: ["grooming"] })],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T19:00:00",
    });
    expect(fees).toEqual([]);
  });
});

describe("an early drop-off fee", () => {
  // `if (fee.condition !== "late_pickup") continue` — the whole feature was
  // authored, stored, displayed, and then skipped at the till.
  test("is charged when the guest arrives before the booked time", () => {
    const fees = computeTimeFees({
      fees: [
        fee({
          id: "early",
          name: "Early drop-off",
          condition: "early_dropoff",
          customTime: "08:00",
          feeType: "flat",
          amount: 12,
        }),
      ],
      serviceId: "daycare",
      scheduledCheckInTime: "2026-09-21T08:00:00",
      actualCheckInTime: "2026-09-21T07:15:00",
    });
    expect(fees).toHaveLength(1);
    expect(fees[0].condition).toBe("early_dropoff");
    expect(fees[0].minutesOver).toBe(45);
    expect(fees[0].amount).toBe(12);
  });

  test("and not when they arrive on time or after", () => {
    const fees = computeTimeFees({
      fees: [fee({ condition: "early_dropoff", customTime: "08:00" })],
      serviceId: "daycare",
      scheduledCheckInTime: "2026-09-21T08:00:00",
      actualCheckInTime: "2026-09-21T08:30:00",
    });
    expect(fees).toEqual([]);
  });

  test("rides alongside a late pickup on the same booking", () => {
    const fees = computeTimeFees({
      fees: [
        fee({ id: "late", feeType: "flat", amount: 20 }),
        fee({
          id: "early",
          condition: "early_dropoff",
          customTime: "08:00",
          feeType: "flat",
          amount: 12,
        }),
      ],
      serviceId: "boarding",
      scheduledCheckInTime: "2026-09-20T08:00:00",
      actualCheckInTime: "2026-09-20T06:30:00",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T19:30:00",
    });
    expect(fees.map((f) => f.ruleId)).toEqual(["early", "late"]);
    expect(timeFeesTotal(fees)).toBe(32);
  });
});

describe("business hours", () => {
  // `basedOn: "business_hours"` read the BOOKED check-out time, so the one
  // setting that exists to say "charge from when we close" behaved exactly
  // like "charge from when they said they would come".
  test("a rule measures from closing time, not from the booked time", () => {
    const fees = computeTimeFees({
      fees: [
        fee({ basedOn: "business_hours", feeType: "per_hour", amount: 10 }),
      ],
      serviceId: "boarding",
      // Booked out at noon, but the facility does not close until 18:00, so a
      // 19:00 pickup is one hour late — not seven.
      scheduledCheckOutTime: "2026-09-21T12:00:00",
      actualCheckOutTime: "2026-09-21T19:00:00",
      checkOutDayHours: { openTime: "07:00", closeTime: "18:00" },
    });
    expect(fees[0].minutesOver).toBe(60);
    expect(fees[0].amount).toBe(10);
  });

  test("an early rule measures from opening time", () => {
    const fees = computeTimeFees({
      fees: [
        fee({
          condition: "early_dropoff",
          basedOn: "business_hours",
          feeType: "flat",
          amount: 8,
        }),
      ],
      serviceId: "daycare",
      scheduledCheckInTime: "2026-09-21T09:00:00",
      actualCheckInTime: "2026-09-21T06:30:00",
      checkInDayHours: { openTime: "07:00", closeTime: "18:00" },
    });
    expect(fees[0].minutesOver).toBe(30);
  });

  // Falling back rather than skipping: a facility that never filled its hours
  // in is collecting this fee today, and a fix does not get to stop that.
  test("with no hours known it falls back to the booked time", () => {
    const fees = computeTimeFees({
      fees: [
        fee({ basedOn: "business_hours", feeType: "per_hour", amount: 10 }),
      ],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T12:00:00",
      actualCheckOutTime: "2026-09-21T13:00:00",
      checkOutDayHours: null,
    });
    expect(fees[0].minutesOver).toBe(60);
  });

  test("a one-day override beats that weekday's hours", () => {
    const weekly = {
      monday: { isOpen: true, openTime: "07:00", closeTime: "18:00" },
    };
    const overrides = [
      { date: "2026-09-21", openTime: "09:00", closeTime: "14:00" },
    ];
    // 2026-09-21 is a Monday.
    expect(facilityHoursForDate("2026-09-21", weekly, overrides)).toEqual({
      isOpen: true,
      openTime: "09:00",
      closeTime: "14:00",
    });
    expect(facilityHoursForDate("2026-09-28", weekly, overrides)).toEqual({
      isOpen: true,
      openTime: "07:00",
      closeTime: "18:00",
    });
  });
});

describe("the apply-window and the custom time", () => {
  test("a fee outside its apply-window does not charge", () => {
    const fees = computeTimeFees({
      fees: [
        fee({
          applyFromTime: "20:00",
          applyUntilTime: "23:00",
          feeType: "flat",
          amount: 25,
        }),
      ],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T19:00:00",
    });
    expect(fees).toEqual([]);
  });

  test("and inside it does", () => {
    const fees = computeTimeFees({
      fees: [
        fee({
          applyFromTime: "20:00",
          applyUntilTime: "23:00",
          feeType: "flat",
          amount: 25,
        }),
      ],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T21:00:00",
    });
    expect(fees[0].amount).toBe(25);
  });

  test("a window that wraps midnight still contains 23:30", () => {
    const fees = computeTimeFees({
      fees: [
        fee({
          applyFromTime: "22:00",
          applyUntilTime: "06:00",
          feeType: "flat",
          amount: 40,
        }),
      ],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T23:30:00",
    });
    expect(fees[0].amount).toBe(40);
  });
});

describe("the arithmetic", () => {
  test("grace is deducted before anything is charged", () => {
    const fees = computeTimeFees({
      fees: [fee({ graceMinutes: 15, feeType: "per_minute", amount: 1 })],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T18:10:00",
    });
    expect(fees).toEqual([]);
  });

  test("a part hour rounds up, as the editor's label says", () => {
    const fees = computeTimeFees({
      fees: [fee({ feeType: "per_hour", amount: 10 })],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T19:05:00",
    });
    expect(fees[0].amount).toBe(20);
  });

  test("maxFee caps it", () => {
    const fees = computeTimeFees({
      fees: [fee({ feeType: "per_hour", amount: 10, maxFee: 35 })],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-22T00:00:00",
    });
    expect(fees[0].amount).toBe(35);
  });

  test("per_pet multiplies and per_booking does not", () => {
    const input = {
      serviceId: "boarding",
      petCount: 3,
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T19:00:00",
    };
    expect(
      computeTimeFees({
        ...input,
        fees: [fee({ scope: "per_pet", feeType: "flat", amount: 10 })],
      })[0].amount,
    ).toBe(30);
    expect(
      computeTimeFees({
        ...input,
        fees: [fee({ scope: "per_booking", feeType: "flat", amount: 10 })],
      })[0].amount,
    ).toBe(10);
  });

  test("extra_night charges one unit of the service, whatever the overrun", () => {
    const fees = computeTimeFees({
      fees: [fee({ feeType: "extra_night" })],
      serviceId: "boarding",
      perUnitBase: 62.5,
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T18:20:00",
    });
    expect(fees[0].amount).toBe(62.5);
  });

  test("a disabled rule charges nothing", () => {
    expect(
      computeTimeFees({
        fees: [fee({ enabled: false })],
        serviceId: "boarding",
        scheduledCheckOutTime: "2026-09-21T18:00:00",
        actualCheckOutTime: "2026-09-21T23:00:00",
      }),
    ).toEqual([]);
  });

  test("no rules at all is no fee, never a default fee", () => {
    expect(
      computeTimeFees({
        fees: undefined,
        serviceId: "boarding",
        scheduledCheckOutTime: "2026-09-21T18:00:00",
        actualCheckOutTime: "2026-09-21T23:00:00",
      }),
    ).toEqual([]);
  });
});

describe("a stay that runs past midnight", () => {
  // Clock minutes alone say "three hours EARLY" for a pickup the next
  // morning. The quote's evaluator compared clock minutes and the till's
  // compared timestamps, so unifying on the wrong one would have turned a
  // late fee into an early-drop-off refund on exactly the overnight stays
  // boarding is made of.
  test("the next morning is late, not early", () => {
    const fees = computeTimeFees({
      fees: [fee({ customTime: "12:00", feeType: "per_hour", amount: 5 })],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T12:00:00",
      actualCheckOutTime: "2026-09-22T09:00:00",
    });
    expect(fees[0].minutesOver).toBe(21 * 60);
    expect(fees[0].amount).toBe(105);
  });

  test("clock times with no date still compare as clock times", () => {
    const fees = computeTimeFees({
      fees: [fee({ customTime: "12:00", feeType: "per_hour", amount: 5 })],
      serviceId: "boarding",
      scheduledCheckOutTime: "12:00",
      actualCheckOutTime: "14:00",
    });
    expect(fees[0].minutesOver).toBe(120);
  });
});

describe("two rules that both match", () => {
  // The quote charged the SUM of every overlapping rule and the till charged
  // whichever was first in the array, so the same booking cost different
  // amounts on two screens. One wins: the last threshold actually crossed.
  test("the later baseline wins for a late pickup, and only it", () => {
    const fees = computeTimeFees({
      fees: [
        fee({ id: "six", customTime: "18:00", feeType: "flat", amount: 10 }),
        fee({ id: "eight", customTime: "20:00", feeType: "flat", amount: 25 }),
      ],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T21:00:00",
    });
    expect(fees).toHaveLength(1);
    expect(fees[0].ruleId).toBe("eight");
    expect(timeFeesTotal(fees)).toBe(25);
  });

  test("a threshold not yet crossed does not win", () => {
    const fees = computeTimeFees({
      fees: [
        fee({ id: "six", customTime: "18:00", feeType: "flat", amount: 10 }),
        fee({ id: "eight", customTime: "20:00", feeType: "flat", amount: 25 }),
      ],
      serviceId: "boarding",
      scheduledCheckOutTime: "2026-09-21T18:00:00",
      actualCheckOutTime: "2026-09-21T19:00:00",
    });
    expect(fees).toHaveLength(1);
    expect(fees[0].ruleId).toBe("six");
  });

  test("early drop-off mirrors it — the earliest baseline crossed wins", () => {
    const fees = computeTimeFees({
      fees: [
        fee({
          id: "seven",
          condition: "early_dropoff",
          customTime: "07:00",
          feeType: "flat",
          amount: 8,
        }),
        fee({
          id: "six",
          condition: "early_dropoff",
          customTime: "06:00",
          feeType: "flat",
          amount: 20,
        }),
      ],
      serviceId: "daycare",
      scheduledCheckInTime: "2026-09-21T08:00:00",
      actualCheckInTime: "2026-09-21T05:30:00",
    });
    expect(fees).toHaveLength(1);
    expect(fees[0].ruleId).toBe("six");
  });
});

describe("quoting a booking nobody has arrived for yet", () => {
  // The New booking form and the grooming flow pass the BOOKED times as the
  // actual ones, because the guest has not arrived. Against a baseline of the
  // booked time that came to zero — so the branch looked dead. It was not: a
  // `custom_time` rule set earlier than the booked check-out charged a late
  // fee the moment the booking was PRICED, and making `business_hours` real
  // would have added a second door in.
  function quote(fees: LatePickupFee[], actualCheckOutTime = "20:00") {
    return applyDynamicPricingRules({
      rules: {
        discountStacking: "best_only",
        multiPetDiscounts: [],
        latePickupFees: fees,
        exceed24Hour: {
          id: "x",
          enabled: false,
          amount: 0,
          scope: "per_booking",
        },
        customFees: [],
        multiNightDiscounts: [],
        peakDateSurcharges: [],
        roomTypeAdjustments: [],
        groomingConditionAdjustments: [],
        serviceBundles: [],
      },
      serviceId: "boarding",
      basePrice: 180,
      existingExtraServices: [],
      selectedPetIds: [1],
      pets: [{ id: 1 }],
      addOnsCatalog: [],
      scheduledCheckInTime: "14:00",
      scheduledCheckOutTime: "20:00",
      actualCheckInTime: "14:00",
      actualCheckOutTime,
    }).adjustments.filter((a) => a.source === "time_fee");
  }

  test("a custom-time rule does not charge before anyone is late", () => {
    expect(
      quote([fee({ customTime: "18:00", feeType: "flat", amount: 30 })]),
    ).toEqual([]);
  });

  test("nor does a business-hours rule when the booking runs past closing", () => {
    expect(
      quote([fee({ basedOn: "business_hours", feeType: "flat", amount: 30 })]),
    ).toEqual([]);
  });

  test("but a guest who really left at 21:00 is charged", () => {
    const charged = quote(
      [fee({ customTime: "18:00", feeType: "flat", amount: 30 })],
      "21:00",
    );
    expect(charged).toHaveLength(1);
    expect(charged[0].amount).toBe(30);
  });
});

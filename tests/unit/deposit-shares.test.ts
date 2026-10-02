import { describe, expect, test } from "bun:test";

import {
  depositPlan,
  type DepositBooking,
} from "@/lib/payments/deposit-shares";
import type { DepositRuleSet } from "@/lib/settings/deposits";

// The deposit the wizard's Confirm asks for, charged or linked (2026-10-02):
// the facility's rule on the whole request, less what is paid, spread over
// the parts in order — the same arithmetic as the cash path.
const rules: DepositRuleSet = [
  {
    id: "boarding",
    scope: "service",
    serviceType: "boarding",
    amountType: "percentage",
    amount: 25,
    enabled: true,
    label: "25% of the stay",
  },
  {
    id: "grooming",
    scope: "service",
    serviceType: "grooming",
    amountType: "fixed",
    amount: 20,
    enabled: true,
    label: "$20",
  },
  {
    id: "daycare",
    scope: "service",
    serviceType: "daycare",
    amountType: "percentage",
    amount: 50,
    enabled: true,
    label: "Half up front",
  },
] as DepositRuleSet;

const booking = (over: Partial<DepositBooking>): DepositBooking => ({
  id: "b1",
  ref: 101,
  service: "boarding",
  due: 460,
  paid: 0,
  ...over,
});

describe("the deposit a request owes", () => {
  test("a stay: the rule on its price, on the one booking", () => {
    const plan = depositPlan({ rules, bookings: [booking({})] });
    expect(plan.amount).toBe(115);
    expect(plan.shares).toEqual([{ bookingId: "b1", ref: 101, amount: 115 }]);
  });

  test("several days: the rule on the whole request, spread in order", () => {
    const days = [1, 2, 3].map((n) =>
      booking({ id: `d${n}`, ref: 200 + n, service: "daycare", due: 55 }),
    );
    const plan = depositPlan({ rules, bookings: days });
    // Half of $165 is $82.50: the first day whole, the rest on the second.
    expect(plan.amount).toBe(82.5);
    expect(plan.shares).toEqual([
      { bookingId: "d1", ref: 201, amount: 55 },
      { bookingId: "d2", ref: 202, amount: 27.5 },
    ]);
  });

  test("a fixed deposit is asked once for the request, not per part", () => {
    const grooms = [
      booking({ id: "g1", ref: 301, service: "grooming", due: 65 }),
      booking({ id: "g2", ref: 302, service: "grooming", due: 45 }),
    ];
    const plan = depositPlan({ rules, bookings: grooms });
    expect(plan.amount).toBe(20);
    expect(plan.shares).toEqual([{ bookingId: "g1", ref: 301, amount: 20 }]);
  });

  test("what is paid counts toward it; paid in full asks nothing", () => {
    expect(
      depositPlan({ rules, bookings: [booking({ paid: 100 })] }).shares,
    ).toEqual([{ bookingId: "b1", ref: 101, amount: 15 }]);
    expect(
      depositPlan({ rules, bookings: [booking({ paid: 115 })] }).shares,
    ).toEqual([]);
  });

  test("no rule for the service asks nothing", () => {
    const plan = depositPlan({
      rules,
      bookings: [booking({ service: "training", due: 280 })],
    });
    expect(plan.rule).toBeNull();
    expect(plan.shares).toEqual([]);
  });
});

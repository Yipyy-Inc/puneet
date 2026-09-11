import { describe, expect, test } from "bun:test";

import type { Membership } from "@/data/services-pricing";
import {
  churnRate,
  memberDiscount,
  monthlyEquivalent,
  monthlyRevenue,
  monthlyTrend,
} from "@/lib/memberships/figures";

function sub(over: Partial<Membership>): Membership {
  return {
    id: "m",
    customerId: "1",
    customerName: "A",
    customerEmail: "a@example.invalid",
    planId: "p",
    planName: "Gold",
    status: "active",
    billingCycle: "monthly",
    monthlyPrice: 90,
    startDate: "2026-01-15",
    nextBillingDate: "2026-10-15",
    creditsRemaining: 0,
    creditsTotal: 0,
    discountPercentage: 0,
    autoRenew: true,
    createdAt: "2026-01-15T12:00:00Z",
    activityLog: [],
    invoices: [],
    ...over,
  };
}

describe("monthlyEquivalent", () => {
  test("a quarterly price is a third of itself a month", () => {
    expect(
      monthlyEquivalent({ monthlyPrice: 270, billingCycle: "quarterly" }),
    ).toBe(90);
  });
  test("an annual price is a twelfth", () => {
    expect(
      monthlyEquivalent({ monthlyPrice: 1200, billingCycle: "annually" }),
    ).toBe(100);
  });
  test("a monthly price is itself", () => {
    expect(
      monthlyEquivalent({ monthlyPrice: 45, billingCycle: "monthly" }),
    ).toBe(45);
  });
});

describe("monthlyRevenue", () => {
  test("counts active plans only, each at its monthly amount", () => {
    const rows = [
      sub({ monthlyPrice: 90 }),
      sub({ monthlyPrice: 270, billingCycle: "quarterly" }),
      sub({ monthlyPrice: 500, status: "paused" }),
      sub({ monthlyPrice: 500, status: "cancelled" }),
    ];
    expect(monthlyRevenue(rows)).toBe(180);
  });
});

describe("monthlyTrend", () => {
  test("a month counts the plans running at its end, and never invents growth", () => {
    const rows = [
      sub({ startDate: "2026-07-03" }),
      sub({ startDate: "2026-09-01", monthlyPrice: 60 }),
    ];
    const trend = monthlyTrend(rows, "2026-09-11", 4);
    expect(trend.map((p) => p.month)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
    expect(trend.map((p) => p.subscribers)).toEqual([0, 1, 1, 2]);
    expect(trend.map((p) => p.mrr)).toEqual([0, 90, 90, 150]);
  });

  test("a cancellation is churn in its month and gone after it", () => {
    const rows = [
      sub({
        startDate: "2026-05-01",
        status: "cancelled",
        endDate: "2026-09-30",
        activityLog: [
          {
            id: "e",
            type: "cancelled",
            date: "2026-08-20T15:00:00Z",
            description: "",
          },
        ],
      }),
    ];
    const trend = monthlyTrend(rows, "2026-09-11", 3);
    expect(trend.map((p) => p.subscribers)).toEqual([1, 0, 0]);
    expect(trend.map((p) => p.churn)).toEqual([0, 1, 0]);
  });

  test("a paused plan is a subscriber that earns nothing this month", () => {
    const rows = [sub({ startDate: "2026-06-01", status: "paused" })];
    const trend = monthlyTrend(rows, "2026-09-11", 2);
    expect(trend.map((p) => p.subscribers)).toEqual([1, 1]);
    expect(trend.map((p) => p.mrr)).toEqual([90, 0]);
  });

  test("January reaches back into the previous year", () => {
    const trend = monthlyTrend([], "2027-01-05", 2);
    expect(trend.map((p) => p.month)).toEqual(["2026-12", "2027-01"]);
  });
});

describe("memberDiscount", () => {
  const gold = { id: "p", applicableServices: ["grooming" as const] };
  // A day inside sub()'s term, which starts 2026-01-15 and has no end.
  const ON = "2026-09-11";
  test("an active member gets the plan's percentage off a covered service", () => {
    const d = memberDiscount(
      [sub({ discountPercentage: 10 })],
      [gold],
      "Grooming",
      84.5,
      ON,
    );
    expect(d?.amount).toBe(8.45);
    expect(d?.percent).toBe(10);
  });
  test("a service the plan does not cover gets nothing", () => {
    expect(
      memberDiscount(
        [sub({ discountPercentage: 10 })],
        [gold],
        "boarding",
        80,
        ON,
      ),
    ).toBeNull();
  });
  test("a plan with no services listed covers every service", () => {
    expect(
      memberDiscount(
        [sub({ discountPercentage: 15 })],
        [{ id: "p", applicableServices: [] }],
        "daycare",
        40,
        ON,
      )?.amount,
    ).toBe(6);
  });
  test("a paused or cancelled membership gets nothing", () => {
    expect(
      memberDiscount(
        [
          sub({ discountPercentage: 10, status: "paused" }),
          sub({ discountPercentage: 10, status: "cancelled" }),
        ],
        [gold],
        "grooming",
        80,
        ON,
      ),
    ).toBeNull();
  });
  test("a deleted plan's members keep the discount they were sold", () => {
    expect(
      memberDiscount([sub({ discountPercentage: 5 })], [], "boarding", 200, ON)
        ?.amount,
    ).toBe(10);
  });
  // The row that found this: "active", 15%, and a term that ended on
  // 2026-01-01 — still discounting every booking eight months later.
  test("a term that has ended gets nothing, whatever its status says", () => {
    expect(
      memberDiscount(
        [
          sub({
            discountPercentage: 15,
            startDate: "2025-01-01",
            endDate: "2026-01-01",
          }),
        ],
        [],
        "daycare",
        64,
        ON,
      ),
    ).toBeNull();
  });
  test("a booking before the term starts gets nothing", () => {
    expect(
      memberDiscount(
        [sub({ discountPercentage: 15, startDate: "2026-10-01" })],
        [],
        "daycare",
        64,
        ON,
      ),
    ).toBeNull();
  });
  test("the first and last days of the term are covered", () => {
    const term = sub({
      discountPercentage: 10,
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });
    expect(
      memberDiscount([term], [], "daycare", 50, "2026-09-01")?.amount,
    ).toBe(5);
    expect(
      memberDiscount([term], [], "daycare", 50, "2026-09-30")?.amount,
    ).toBe(5);
    expect(memberDiscount([term], [], "daycare", 50, "2026-10-01")).toBeNull();
  });
});

describe("churnRate", () => {
  test("is zero with nobody, and a share of everyone otherwise", () => {
    expect(churnRate([])).toBe(0);
    expect(
      churnRate([sub({}), sub({ status: "cancelled" }), sub({}), sub({})]),
    ).toBe(25);
  });
});

import { describe, expect, test } from "bun:test";

import {
  computeDepositAmount,
  ensureAllServiceRules,
  findApplicableDepositRule,
  NO_DEPOSITS,
} from "../../src/lib/settings/deposits";
import type { DepositRule } from "../../src/types/deposit-rules";

// ============================================================================
// These two functions decide what a customer is asked to pay, and they were
// just moved out of src/data/deposit-rules.ts, where they had been priced off
// localStorage — so the deposit depended on which browser took the booking.
//
// The move is why these tests exist. Rewriting them from their signatures
// produced THREE silent differences: rounding applied to fixed amounts, an
// enabled check the original does not make, and the precedence backwards. None
// of the three throws, none fails a type check, and each one changes a real
// charge. Static analysis cannot see any of it and an e2e test would have to
// seed a booking of a particular size to reach it.
// ============================================================================

const rule = (over: Partial<DepositRule>): DepositRule => ({
  id: "r",
  scope: "service",
  serviceType: "boarding",
  amountType: "fixed",
  amount: 25,
  enabled: true,
  label: "test",
  ...over,
});

describe("computeDepositAmount", () => {
  test("a percentage is taken of the total, to the cent", () => {
    expect(
      computeDepositAmount(
        rule({ amountType: "percentage", amount: 30 }),
        249.99,
      ),
    ).toBe(75);
    expect(
      computeDepositAmount(
        rule({ amountType: "percentage", amount: 25 }),
        33.33,
      ),
    ).toBe(8.33);
  });

  test("a fixed amount is returned exactly as the facility typed it", () => {
    // Not rounded, not scaled by the total. $25 means $25 on a $40 booking and
    // on a $4,000 one.
    expect(computeDepositAmount(rule({ amount: 25 }), 40)).toBe(25);
    expect(computeDepositAmount(rule({ amount: 25 }), 4000)).toBe(25);
    expect(computeDepositAmount(rule({ amount: 12.5 }), 99)).toBe(12.5);
  });
});

describe("findApplicableDepositRule", () => {
  const boarding = rule({
    id: "svc",
    serviceType: "boarding",
    amountType: "percentage",
    amount: 30,
  });
  const highValue = rule({
    id: "val",
    scope: "booking_value",
    serviceType: undefined,
    amountType: "percentage",
    amount: 25,
    minBookingValue: 200,
  });

  test("the service rule wins over the booking-value rule", () => {
    // A facility that set terms for boarding means them for every boarding
    // stay. Getting this backwards charges 25% where the business said 30%.
    expect(
      findApplicableDepositRule("boarding", 600, [highValue, boarding])?.id,
    ).toBe("svc");
  });

  test("the booking-value rule catches a service with no term of its own", () => {
    expect(
      findApplicableDepositRule("daycare", 600, [highValue, boarding])?.id,
    ).toBe("val");
  });

  test("under the threshold, and with no service rule, nothing applies", () => {
    expect(findApplicableDepositRule("daycare", 199, [highValue])).toBeNull();
  });

  test("a disabled rule, or one left on at zero, does not apply", () => {
    expect(
      findApplicableDepositRule("boarding", 50, [
        { ...boarding, enabled: false },
      ]),
    ).toBeNull();
    // On at zero asks for nothing, and must not shadow the threshold beneath.
    expect(
      findApplicableDepositRule("boarding", 600, [
        { ...boarding, amount: 0 },
        highValue,
      ])?.id,
    ).toBe("val");
  });

  test("no service named still consults the threshold", () => {
    expect(
      findApplicableDepositRule(undefined, 600, [boarding, highValue])?.id,
    ).toBe("val");
  });
});

describe("the unconfigured facility", () => {
  test("asks for no deposit at all", () => {
    // The whole point of the empty fallback. Every rule present so the editor
    // has rows, every one of them off, so nothing is charged until somebody
    // says so.
    for (const total of [10, 199, 200, 5000]) {
      for (const service of ["boarding", "daycare", "grooming", "training"]) {
        expect(
          findApplicableDepositRule(service, total, NO_DEPOSITS.rules),
        ).toBeNull();
      }
    }
  });

  test("but the editor still has a row for every service", () => {
    const services = NO_DEPOSITS.rules
      .filter((r) => r.scope === "service")
      .map((r) => r.serviceType);
    expect(services.sort()).toEqual([
      "boarding",
      "daycare",
      "grooming",
      "training",
    ]);
    expect(NO_DEPOSITS.rules.some((r) => r.scope === "booking_value")).toBe(
      true,
    );
    expect(NO_DEPOSITS.rules.every((r) => !r.enabled)).toBe(true);
  });
});

describe("ensureAllServiceRules", () => {
  test("drops a rule for a service that no longer takes deposits", () => {
    const stale = rule({ id: "retail", serviceType: "retail" });
    expect(
      ensureAllServiceRules([stale]).some((r) => r.serviceType === "retail"),
    ).toBe(false);
  });

  test("keeps what is already configured", () => {
    const configured = rule({
      id: "mine",
      serviceType: "grooming",
      amount: 40,
    });
    const completed = ensureAllServiceRules([configured]);
    expect(completed.find((r) => r.id === "mine")?.amount).toBe(40);
    expect(completed.find((r) => r.id === "mine")?.enabled).toBe(true);
  });

  test("everything it adds is off", () => {
    const added = ensureAllServiceRules([]).filter((r) => r.enabled);
    expect(added).toEqual([]);
  });
});

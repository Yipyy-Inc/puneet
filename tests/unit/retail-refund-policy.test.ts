import { describe, expect, test } from "bun:test";

import {
  SHIPPED_REFUND_POLICY,
  refundPolicyFromStored,
  refundPolicyOf,
  refundRefusal,
} from "@/lib/retail/refund-policy";

describe("refundPolicyOf", () => {
  test("a configuration saved before the policy existed reads as the shipped one", () => {
    expect(refundPolicyOf({})).toEqual(SHIPPED_REFUND_POLICY);
  });
});

describe("refundPolicyFromStored", () => {
  test("a stored policy that no longer parses reads as the shipped one", () => {
    expect(
      refundPolicyFromStored({ refundPolicy: { refundMethods: "all" } }),
    ).toEqual(SHIPPED_REFUND_POLICY);
    expect(refundPolicyFromStored(null)).toEqual(SHIPPED_REFUND_POLICY);
  });

  test("a stored policy is the facility's", () => {
    const own = structuredClone(SHIPPED_REFUND_POLICY);
    own.refundRules.managerApprovalThreshold = 40;
    expect(refundPolicyFromStored({ refundPolicy: own })).toEqual(own);
  });
});

describe("refundRefusal", () => {
  const card = { method: "original_payment" as const, canApprove: false };

  test("up to the threshold anyone may refund; above it needs an owner or manager", () => {
    expect(refundRefusal(SHIPPED_REFUND_POLICY, { ...card, amount: 100 })).toBe(
      null,
    );
    expect(
      refundRefusal(SHIPPED_REFUND_POLICY, { ...card, amount: 100.01 }),
    ).toBe("needs_approval");
    expect(
      refundRefusal(SHIPPED_REFUND_POLICY, {
        ...card,
        amount: 500,
        canApprove: true,
      }),
    ).toBe(null);
  });

  test("with approval switched off, no amount needs it", () => {
    const policy = structuredClone(SHIPPED_REFUND_POLICY);
    policy.refundRules.managerApprovalRequired = false;
    expect(refundRefusal(policy, { ...card, amount: 5000 })).toBe(null);
  });

  test("a method the facility turned off is refused, whoever asks", () => {
    const policy = structuredClone(SHIPPED_REFUND_POLICY);
    policy.refundMethods.cash = false;
    expect(
      refundRefusal(policy, { method: "cash", amount: 5, canApprove: true }),
    ).toBe("method_off");
  });
});

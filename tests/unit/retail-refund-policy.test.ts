import { describe, expect, test } from "bun:test";

import {
  SHIPPED_REFUND_POLICY,
  refundPolicyFromStored,
  refundPolicyOf,
  refundRecordRefusal,
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

describe("refundRecordRefusal", () => {
  const strict = structuredClone(SHIPPED_REFUND_POLICY);
  strict.refundRules.requireReason = true;
  strict.refundRules.requireNotes = true;

  test("the shipped policy asks for neither", () => {
    expect(
      refundRecordRefusal(SHIPPED_REFUND_POLICY, { items: [], notes: "" }),
    ).toBe(null);
  });

  test("every item needs a reason, and 'other' needs its own words", () => {
    const notes = "Customer changed their mind";
    expect(
      refundRecordRefusal(strict, {
        items: [{ reason: "damaged" }, { reason: "" }],
        notes,
      }),
    ).toBe("reason_required");
    expect(
      refundRecordRefusal(strict, { items: [{ reason: "other" }], notes }),
    ).toBe("reason_required");
    expect(
      refundRecordRefusal(strict, {
        items: [{ reason: "other", reasonNotes: "Wrong size" }],
        notes,
      }),
    ).toBe(null);
  });

  test("a request that names no items has given no reason", () => {
    expect(refundRecordRefusal(strict, { items: [], notes: "x" })).toBe(
      "reason_required",
    );
  });

  test("blank notes are no notes", () => {
    expect(
      refundRecordRefusal(strict, {
        items: [{ reason: "damaged" }],
        notes: "   ",
      }),
    ).toBe("notes_required");
  });
});

import { z } from "zod";

import type { RetailRefundPolicy } from "@/data/retail-config";

// ============================================================================
// A facility's retail refund policy, and the one decision made from it.
//
// It was a constant in the orders page — every method offered, a refund over
// $100 needs an owner or a manager — the same at every facility, and copied
// from facility 11's fixture before that. It is part of `retail_config` now,
// edited in Retail settings.
//
// The screen and `/api/payments/retail/refund` both ask `refundRefusal`, so a
// cashier who skips the dialog cannot refund past the approval threshold, or
// to the card when the facility turned that method off.
// ============================================================================

export const retailRefundPolicySchema = z.object({
  refundMethods: z.object({
    originalPayment: z.boolean(),
    cash: z.boolean(),
    storeCredit: z.boolean(),
    giftCard: z.boolean(),
    custom: z.boolean(),
  }),
  refundRules: z.object({
    managerApprovalRequired: z.boolean(),
    managerApprovalThreshold: z.number().min(0).max(100_000),
    requireReason: z.boolean(),
    requireNotes: z.boolean(),
  }),
});

/** The values the constant held, so no facility's till changes until it edits them. */
export const SHIPPED_REFUND_POLICY: RetailRefundPolicy = {
  refundMethods: {
    originalPayment: true,
    cash: true,
    storeCredit: true,
    giftCard: true,
    custom: true,
  },
  refundRules: {
    managerApprovalRequired: true,
    managerApprovalThreshold: 100,
    requireReason: false,
    requireNotes: false,
  },
};

export function refundPolicyOf(config: {
  refundPolicy?: RetailRefundPolicy;
}): RetailRefundPolicy {
  return config.refundPolicy ?? SHIPPED_REFUND_POLICY;
}

/** A stored `retail_config` value, as the refund route reads it. */
export function refundPolicyFromStored(value: unknown): RetailRefundPolicy {
  const stored = (value as { refundPolicy?: unknown } | null)?.refundPolicy;
  const parsed = retailRefundPolicySchema.safeParse(stored);
  return parsed.success ? parsed.data : SHIPPED_REFUND_POLICY;
}

export type RefundMethodKey =
  | "original_payment"
  | "cash"
  | "store_credit"
  | "gift_card"
  | "custom";

const METHOD_FIELD: Record<
  RefundMethodKey,
  keyof RetailRefundPolicy["refundMethods"]
> = {
  original_payment: "originalPayment",
  cash: "cash",
  store_credit: "storeCredit",
  gift_card: "giftCard",
  custom: "custom",
};

export function refundMethodAllowed(
  policy: RetailRefundPolicy,
  method: RefundMethodKey,
): boolean {
  return policy.refundMethods[METHOD_FIELD[method]];
}

export type RefundRefusal = "method_off" | "needs_approval";

/**
 * Why this refund may not be made, or null.
 *
 * `amount` is in dollars. `canApprove` is an owner, a manager or a platform
 * admin. Equal to the threshold is allowed: "over $100" is what it says.
 */
export function refundRefusal(
  policy: RetailRefundPolicy,
  input: { method: RefundMethodKey; amount: number; canApprove: boolean },
): RefundRefusal | null {
  if (!refundMethodAllowed(policy, input.method)) return "method_off";
  const rules = policy.refundRules;
  if (
    rules.managerApprovalRequired &&
    !input.canApprove &&
    input.amount > rules.managerApprovalThreshold
  ) {
    return "needs_approval";
  }
  return null;
}

export type RefundRecordRefusal = "reason_required" | "notes_required";

/**
 * Whether the return says why, as the facility's policy asks.
 *
 * The same rule the return dialog applies: every item has a reason, and
 * "other" carries its own words. The route asks it too, so a request made
 * without the dialog cannot refund with no reason or notes on record.
 */
export function refundRecordRefusal(
  policy: RetailRefundPolicy,
  record: {
    items: { reason?: string | null; reasonNotes?: string | null }[];
    notes?: string | null;
  },
): RefundRecordRefusal | null {
  const rules = policy.refundRules;
  if (rules.requireReason) {
    const unexplained =
      record.items.length === 0 ||
      record.items.some(
        (item) =>
          !item.reason?.trim() ||
          (item.reason === "other" && !item.reasonNotes?.trim()),
      );
    if (unexplained) return "reason_required";
  }
  if (rules.requireNotes && !record.notes?.trim()) return "notes_required";
  return null;
}

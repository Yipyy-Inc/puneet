import type {
  QuickBooksCompanyData,
  QuickBooksCustomer,
  QuickBooksRefundReceipt,
  QuickBooksSalesLine,
  QuickBooksSalesReceipt,
} from "@/types/quickbooks";

import { isMapped, type MappingSet } from "../mappings-store";
import type { QuickBooksSettings } from "../settings-store";
import {
  accountRef,
  appendRoundingLine,
  findAccountByName,
  lineTotalCents,
  resolveCustomer,
  toCents,
  toDollars,
  toQuickBooksPaymentMethod,
} from "./shared";

// ============================================================================
// Memberships (Table 7 / 5D).
//
// A membership is a recurring sale, and the thing that matters is that EACH
// PERIOD gets its own document with the period in the description. Roll a year
// of billing into one entry and the facility can't answer "what did we bill in
// March", which is the only question a recurring plan ever raises.
//
//   sale / renewal        → a Sales Receipt per period
//   cancellation, no refund → NO entry. Nothing moved. Writing a $0 document
//                             would put noise in the log for an event that has
//                             no accounting consequence.
//   cancellation + refund   → a pro-rated Refund Receipt for the unused part
//   member discount         → a discount line named for the tier, so the cost
//                             of the programme is visible instead of hidden in
//                             lower service prices
//
// TODO: real QuickBooks API (POST …/salesreceipt, POST …/refundreceipt).
// ============================================================================

export interface MembershipContext {
  data: QuickBooksCompanyData;
  mappings: MappingSet;
  settings: QuickBooksSettings;
  catchAllAccountId: string;
}

export interface BuiltMembershipReceipt {
  receipt: QuickBooksSalesReceipt;
  customerToCreate?: QuickBooksCustomer;
  warnings: string[];
}

export type MembershipBillingCycle = "monthly" | "quarterly" | "annual";

const CYCLE_MONTHS: Record<MembershipBillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

/** The period a charge covers, as a human-readable label for the line. */
export function membershipPeriodLabel(
  periodStart: string,
  cycle: MembershipBillingCycle,
): string {
  const start = new Date(`${periodStart.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return periodStart.slice(0, 10);

  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + CYCLE_MONTHS[cycle]);
  // The period ends the day before the next one starts — a client billed on
  // the 1st is covered through the 31st, not into the next month.
  end.setUTCDate(end.getUTCDate() - 1);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(start)} – ${fmt(end)}`;
}

export interface MembershipChargeInput {
  /** Yipyy id of THIS period's charge — the idempotency anchor. Two months of
   *  the same membership must not collapse into one document. */
  chargeId: string;
  membershipId: string;
  planName: string;
  tierLabel?: string;
  amount: number;
  taxAmount?: number;
  cycle: MembershipBillingCycle;
  periodStart: string;
  chargedAt: string;
  /** False for the first charge — the wording differs and people read it. */
  isRenewal?: boolean;
  paymentMethod?: string;
  receiptNumber?: string;
  customerName?: string;
  customerEmail?: string;
}

/** A membership period was billed. */
export function buildMembershipReceipt(
  charge: MembershipChargeInput,
  ctx: MembershipContext,
): BuiltMembershipReceipt {
  const warnings: string[] = [];

  const customer = resolveCustomer(charge, ctx.data);
  if (customer.warning) warnings.push(customer.warning);

  const mapping = ctx.mappings[`membership:${charge.membershipId}`];
  if (!isMapped(mapping)) {
    warnings.push(
      `"${charge.planName}" isn't mapped to a QuickBooks account — posted to Yipyy Unassigned Income.`,
    );
  }

  const taxCode = ctx.data.taxCodes.find((t) => t.Taxable);
  const taxCodeRef = taxCode
    ? { value: taxCode.Id, name: taxCode.Name }
    : undefined;

  const amountCents = toCents(charge.amount);
  const taxCents = toCents(charge.taxAmount ?? 0);
  const period = membershipPeriodLabel(charge.periodStart, charge.cycle);

  const lines: QuickBooksSalesLine[] = [
    {
      LineNum: 1,
      // The period is IN the description, not just the memo: this is the line
      // a bookkeeper reads in a register, and "Gold Membership" twice in one
      // month is indistinguishable from a double charge without it.
      Description: `${charge.planName}${
        charge.tierLabel ? ` (${charge.tierLabel})` : ""
      } — ${charge.cycle} ${period}`,
      Amount: toDollars(amountCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: mapping?.itemId
          ? {
              value: mapping.itemId,
              name: ctx.data.items.find((i) => i.Id === mapping.itemId)?.Name,
            }
          : { value: "unassigned", name: charge.planName },
        ItemAccountRef: accountRef(
          ctx.data,
          mapping?.accountId ?? ctx.catchAllAccountId,
        ),
        UnitPrice: charge.amount,
        Qty: 1,
        TaxCodeRef: taxCodeRef,
      },
    },
  ];

  const totalCents = amountCents + taxCents;
  appendRoundingLine(
    lines,
    totalCents - (lineTotalCents(lines) + taxCents),
    ctx.data,
    warnings,
  );

  const receipt: QuickBooksSalesReceipt = {
    DocNumber: charge.receiptNumber,
    TxnDate: charge.chargedAt.slice(0, 10),
    CustomerRef: customer.ref,
    DepositToAccountRef: accountRef(ctx.data, ctx.settings.depositAccountId),
    PaymentMethodRef: {
      value: toQuickBooksPaymentMethod(charge.paymentMethod ?? ""),
    },
    CurrencyRef: { value: "CAD" },
    Line: lines,
    TxnTaxDetail:
      taxCents > 0
        ? { TxnTaxCodeRef: taxCodeRef, TotalTax: toDollars(taxCents) }
        : undefined,
    PrivateNote: [
      charge.isRenewal ? "Membership renewal" : "Membership sale",
      charge.planName,
      `Period ${period}`,
      `Yipyy charge ${charge.chargeId}`,
    ].join(" | "),
    TotalAmt: toDollars(totalCents),
  };

  return { receipt, customerToCreate: customer.create, warnings };
}

// ── Cancellation ────────────────────────────────────────────────────────────

export interface MembershipCancellationInput extends MembershipChargeInput {
  cancelledAt: string;
  /** Explicit refund amount. When absent it is pro-rated from the dates. */
  refundAmount?: number;
  reason?: string;
}

export type MembershipCancellationOutcome =
  | { kind: "no_entry"; reason: string }
  | { kind: "refund"; refund: QuickBooksRefundReceipt; warnings: string[] };

/**
 * The unused share of a period, in dollars.
 *
 * Counted in whole days: part of a day is a day the client still had access to,
 * so the facility keeps it. Rounds to the cent and never exceeds what was
 * charged.
 */
export function proratedRefund(
  amount: number,
  periodStart: string,
  cycle: MembershipBillingCycle,
  cancelledAt: string,
): number {
  const start = Date.parse(`${periodStart.slice(0, 10)}T00:00:00Z`);
  const cancel = Date.parse(`${cancelledAt.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(cancel)) return 0;

  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + CYCLE_MONTHS[cycle]);
  const totalDays = Math.round((end.getTime() - start) / 86_400_000);
  if (totalDays <= 0) return 0;

  const usedDays = Math.max(0, Math.round((cancel - start) / 86_400_000));
  const unusedDays = Math.max(0, Math.min(totalDays, totalDays - usedDays));

  return toDollars(Math.round((toCents(amount) * unusedDays) / totalDays));
}

/**
 * A membership was cancelled.
 *
 * With no refund this returns NO DOCUMENT. That is the correct accounting
 * answer — the client keeps their benefits to the end of the period they paid
 * for, and nothing has moved.
 */
export function buildMembershipCancellation(
  cancellation: MembershipCancellationInput,
  ctx: MembershipContext,
): MembershipCancellationOutcome {
  const refundAmount =
    cancellation.refundAmount ??
    proratedRefund(
      cancellation.amount,
      cancellation.periodStart,
      cancellation.cycle,
      cancellation.cancelledAt,
    );

  if (toCents(refundAmount) <= 0) {
    return {
      kind: "no_entry",
      reason:
        "Cancelled with no refund — benefits run to the end of the period already paid for, so nothing moved and no entry is needed.",
    };
  }

  const warnings: string[] = [];
  const customer = resolveCustomer(cancellation, ctx.data);
  if (customer.warning) warnings.push(customer.warning);

  const mapping = ctx.mappings[`membership:${cancellation.membershipId}`];
  if (!isMapped(mapping)) {
    warnings.push(
      `"${cancellation.planName}" isn't mapped to a QuickBooks account — the refund reverses Yipyy Unassigned Income.`,
    );
  }

  const refundCents = toCents(refundAmount);
  const chargedCents = toCents(cancellation.amount);
  if (refundCents > chargedCents) {
    warnings.push(
      `The refund of ${refundAmount.toFixed(2)} is larger than the ${cancellation.amount.toFixed(2)} charged for this period — check the pro-rating.`,
    );
  }

  const period = membershipPeriodLabel(
    cancellation.periodStart,
    cancellation.cycle,
  );

  const refund: QuickBooksRefundReceipt = {
    DocNumber: cancellation.receiptNumber
      ? `REF-${cancellation.receiptNumber}`
      : undefined,
    TxnDate: cancellation.cancelledAt.slice(0, 10),
    CustomerRef: customer.ref,
    DepositToAccountRef: accountRef(ctx.data, ctx.settings.depositAccountId),
    PaymentMethodRef: {
      value: toQuickBooksPaymentMethod(cancellation.paymentMethod ?? ""),
    },
    CurrencyRef: { value: "CAD" },
    Line: [
      {
        LineNum: 1,
        Description: `${cancellation.planName} — unused portion of ${period}`,
        Amount: toDollars(refundCents),
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: mapping?.itemId
            ? {
                value: mapping.itemId,
                name: ctx.data.items.find((i) => i.Id === mapping.itemId)?.Name,
              }
            : { value: "unassigned", name: cancellation.planName },
          // Reverses the SAME income account the charge went to.
          ItemAccountRef: accountRef(
            ctx.data,
            mapping?.accountId ?? ctx.catchAllAccountId,
          ),
          Qty: 1,
        },
      },
    ],
    PrivateNote: [
      `Membership cancelled — ${cancellation.planName}`,
      cancellation.reason ?? "Cancelled by client",
      `Pro-rated refund for ${period}`,
    ].join(" | "),
    TotalAmt: toDollars(refundCents),
  };

  return { kind: "refund", refund, warnings };
}

// ── Member discount at checkout ─────────────────────────────────────────────

export interface MemberDiscount {
  amount: number;
  tierLabel: string;
}

/** "[tier] member discount" — the label Table 7 asks for. */
export function memberDiscountLabel(tierLabel: string): string {
  return `${tierLabel} member discount`;
}

/**
 * Add a member discount to a receipt as its own line.
 *
 * Kept separate from the service price on purpose: a facility running a
 * membership programme needs to see what it costs them. Folded into the service
 * price it is invisible, and the only symptom is that grooming revenue looks
 * quietly lower every year.
 */
export function applyMemberDiscountToReceipt(
  receipt: QuickBooksSalesReceipt,
  discount: MemberDiscount,
  ctx: Pick<MembershipContext, "data" | "settings">,
): { receipt: QuickBooksSalesReceipt; warnings: string[] } {
  const warnings: string[] = [];
  const discountCents = Math.min(
    toCents(discount.amount),
    toCents(receipt.TotalAmt),
  );
  if (discountCents <= 0) return { receipt, warnings };

  const discountRef =
    accountRef(ctx.data, ctx.settings.discountAccountId) ??
    findAccountByName(ctx.data, /discount/i);
  if (!discountRef) {
    warnings.push(
      "No discount account is set — the member discount line has no account.",
    );
  }

  const line: QuickBooksSalesLine = {
    LineNum: receipt.Line.length + 1,
    Description: memberDiscountLabel(discount.tierLabel),
    Amount: -toDollars(discountCents),
    DetailType: "SalesItemLineDetail",
    SalesItemLineDetail: {
      ItemRef: { value: "member-discount", name: "Member Discount" },
      ItemAccountRef: discountRef,
      Qty: 1,
    },
  };

  return {
    receipt: {
      ...receipt,
      Line: [...receipt.Line, line],
      TotalAmt: toDollars(toCents(receipt.TotalAmt) - discountCents),
    },
    warnings,
  };
}

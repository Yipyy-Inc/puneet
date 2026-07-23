import type { Return, ReturnItem, Transaction } from "@/types/retail";
import type {
  QuickBooksCompanyData,
  QuickBooksCustomer,
  QuickBooksRef,
  QuickBooksRefundReceipt,
  QuickBooksSalesLine,
} from "@/types/quickbooks";

import { isMapped, type MappingSet } from "../mappings-store";
import type { QuickBooksSettings } from "../settings-store";
import {
  accountRef,
  appendRoundingLine,
  lineTotalCents,
  resolveCustomer,
  toCents,
  toDollars,
  toQuickBooksPaymentMethod,
} from "./shared";

// ============================================================================
// Table 9 — a Yipyy return becomes a QuickBooks Refund Receipt (Phase 6 / 5F).
//
// A refund is the mirror of the sale: the same customer, the same items, the
// same accounts — money going back out of the account it came into. Mirroring
// matters more than it sounds. A refund posted to a generic "Refunds" account
// leaves the original income account overstated forever, so the grooming income
// line in a P&L never comes back down.
//
// A refund taken as store credit is NOT built here — no money leaves the
// business, so it is a Credit Memo (see credit-memo.ts).
//
// TODO: real QuickBooks API (POST /v3/company/{realmId}/refundreceipt).
// ============================================================================

export interface RefundReceiptContext {
  data: QuickBooksCompanyData;
  mappings: MappingSet;
  settings: QuickBooksSettings;
  catchAllAccountId: string;
  /** The Sales Receipt this reverses, when Yipyy knows what QuickBooks called
   *  it. Turns the PrivateNote reference into a real link. */
  originalDocumentId?: string;
  originalDocumentNumber?: string;
}

export interface BuiltRefundReceipt {
  refund: QuickBooksRefundReceipt;
  customerToCreate?: QuickBooksCustomer;
  /** True when the whole sale came back, not just some lines. */
  isFullRefund: boolean;
  warnings: string[];
}

/** The mappings-store key for a returned line. Return items are always retail
 *  products — services are refunded through the booking, not the till. */
function mappingKeyForReturnItem(item: ReturnItem): string {
  return `product:${item.productId}`;
}

/**
 * Did the whole sale come back?
 *
 * Judged on the goods, not the money: a full return refunded at a restocking
 * discount is still a full return, and a partial return that happens to equal
 * the sale total (tax, tips) is not.
 */
export function isFullRefund(txn: Transaction, ret: Return): boolean {
  // Cart items carry no id of their own, so product + variant is the identity.
  const key = (i: { productId?: string; variantId?: string }) =>
    `${i.productId ?? ""}:${i.variantId ?? ""}`;

  const returned = new Map<string, number>();
  for (const item of ret.items) {
    returned.set(key(item), (returned.get(key(item)) ?? 0) + item.quantity);
  }

  return txn.items.every(
    (sold) => (returned.get(key(sold)) ?? 0) >= sold.quantity,
  );
}

function buildRefundLines(
  ret: Return,
  ctx: RefundReceiptContext,
  taxCodeRef: QuickBooksRef | undefined,
): { lines: QuickBooksSalesLine[]; warnings: string[] } {
  const lines: QuickBooksSalesLine[] = [];
  const warnings: string[] = [];

  for (const item of ret.items) {
    const key = mappingKeyForReturnItem(item);
    const mapping = ctx.mappings[key];

    if (!isMapped(mapping)) {
      warnings.push(
        `"${item.productName}" isn't mapped to a QuickBooks account — refunded against Yipyy Unassigned Income.`,
      );
    }

    // The SAME account the sale posted to. This is the point of the document.
    const accountId = mapping?.accountId ?? ctx.catchAllAccountId;

    lines.push({
      LineNum: lines.length + 1,
      Description: item.variantName
        ? `${item.productName} (${item.variantName})`
        : item.productName,
      // Positive: a Refund Receipt's lines are what is being refunded, and
      // QuickBooks applies the direction. Negating here would post the refund
      // as extra income.
      Amount: toDollars(toCents(item.total)),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: mapping?.itemId
          ? {
              value: mapping.itemId,
              name: ctx.data.items.find((i) => i.Id === mapping.itemId)?.Name,
            }
          : { value: "unassigned", name: item.productName },
        ItemAccountRef: accountRef(ctx.data, accountId),
        UnitPrice: item.unitPrice,
        Qty: item.quantity,
        TaxCodeRef: taxCodeRef,
      },
    });
  }

  return { lines, warnings };
}

/**
 * Build the Refund Receipt for a Yipyy return.
 *
 * `ret.refundTotal` is the anchor (RULE 5A): it is what the client actually got
 * back, so the document totals to exactly that. Tax is DERIVED from the gap
 * between the refunded goods and the refund total rather than recomputed —
 * whether Yipyy handed back the tax is a fact about the refund, not something
 * to assume, and assuming it would put a phantom rounding line on every return.
 */
export function buildRefundReceipt(
  txn: Transaction,
  ret: Return,
  ctx: RefundReceiptContext,
): BuiltRefundReceipt {
  const warnings: string[] = [];

  const customer = resolveCustomer(
    {
      customerName: ret.customerName ?? txn.customerName,
      customerEmail: ret.customerEmail ?? txn.customerEmail,
    },
    ctx.data,
  );
  if (customer.warning) warnings.push(customer.warning);

  const taxCode = ctx.data.taxCodes.find((t) => t.Taxable);
  const taxCodeRef = taxCode
    ? { value: taxCode.Id, name: taxCode.Name }
    : undefined;

  const { lines, warnings: lineWarnings } = buildRefundLines(
    ret,
    ctx,
    taxCodeRef,
  );
  warnings.push(...lineWarnings);

  const full = isFullRefund(txn, ret);
  const refundTotalCents = toCents(ret.refundTotal);
  const goodsCents = lineTotalCents(lines);

  // What share of the original tax could this refund possibly carry?
  const originalSubtotalCents = toCents(txn.subtotal);
  const originalTaxCents = toCents(txn.taxTotal ?? 0);
  const proportionalTaxCents = full
    ? originalTaxCents
    : originalSubtotalCents > 0
      ? Math.round((originalTaxCents * goodsCents) / originalSubtotalCents)
      : 0;

  // Refunded tax is the gap between the goods and what went back, capped by
  // that share. A facility that refunds goods but keeps the tax gets no tax
  // line; one that refunds everything gets the whole thing.
  const taxCents = Math.min(
    Math.max(0, refundTotalCents - goodsCents),
    proportionalTaxCents,
  );

  appendRoundingLine(
    lines,
    refundTotalCents - (goodsCents + taxCents),
    ctx.data,
    warnings,
    "Refund adjustment",
  );

  const originalRef = ctx.originalDocumentNumber
    ? `QuickBooks ${ctx.originalDocumentNumber}`
    : `Yipyy ${txn.transactionNumber}`;

  const noteParts = [
    `${full ? "Full" : "Partial"} refund of ${originalRef}`,
    `Yipyy Return ${ret.returnNumber}`,
  ];
  const reasons = [...new Set(ret.items.map((i) => i.reason).filter(Boolean))];
  if (reasons.length > 0) noteParts.push(`Reason: ${reasons.join(", ")}`);
  if (ret.refundMethod === "custom" && ret.customRefundMethodName)
    noteParts.push(ret.customRefundMethodName);

  // Money goes back out of wherever it was deposited. A gift-card refund is the
  // exception: nothing leaves the bank, the facility takes on a liability.
  const refundFrom =
    ret.refundMethod === "gift_card"
      ? (ctx.data.accounts.find((a) => a.Active && /gift\s*card/i.test(a.Name))
          ?.Id ?? ctx.settings.depositAccountId)
      : ctx.settings.depositAccountId;

  const refund: QuickBooksRefundReceipt = {
    DocNumber: ret.returnNumber,
    TxnDate: (ret.completedAt ?? ret.createdAt).slice(0, 10),
    CustomerRef: customer.ref,
    DepositToAccountRef: accountRef(ctx.data, refundFrom),
    PaymentMethodRef: {
      value: toQuickBooksPaymentMethod(
        ret.refundMethod === "original_payment"
          ? txn.paymentMethod
          : ret.refundMethod,
      ),
    },
    CurrencyRef: { value: "CAD" },
    Line: lines,
    TxnTaxDetail:
      taxCents > 0
        ? { TxnTaxCodeRef: taxCodeRef, TotalTax: toDollars(taxCents) }
        : undefined,
    LinkedTxn: ctx.originalDocumentId
      ? [{ TxnId: ctx.originalDocumentId, TxnType: "SalesReceipt" }]
      : undefined,
    PrivateNote: noteParts.join(" | "),
    TotalAmt: toDollars(refundTotalCents),
  };

  return {
    refund,
    customerToCreate: customer.create,
    isFullRefund: full,
    warnings,
  };
}

/** RULE 5A for this document, exposed so callers and checks can assert it. */
export function refundBalances(refund: QuickBooksRefundReceipt): boolean {
  const lines = lineTotalCents(refund.Line);
  const tax = toCents(refund.TxnTaxDetail?.TotalTax ?? 0);
  return lines + tax === toCents(refund.TotalAmt);
}

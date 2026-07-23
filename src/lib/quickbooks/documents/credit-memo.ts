import type { Return, StoreCredit, Transaction } from "@/types/retail";
import type { Invoice } from "@/types/payments";
import type {
  QuickBooksCompanyData,
  QuickBooksCreditMemo,
  QuickBooksCustomer,
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
  preferredAccount,
  resolveCustomer,
  toCents,
  toDollars,
} from "./shared";

// ============================================================================
// Credit Memos (Phase 6).
//
// Three Yipyy events land on the same QuickBooks entity, and what separates
// them is the account the line posts to:
//
//   refund taken as store credit → reverses revenue, creates a credit the
//                                  customer holds. No money leaves the bank.
//   store credit applied to a sale → not a memo at all: a negative line on the
//                                  sale, reducing what was actually collected.
//   invoice written off           → reverses revenue against Bad Debt, so the
//                                  receivable stops pretending it is collectable.
//
// The middle one is the subtle one. If a $50 sale is settled with $20 of store
// credit, the facility banked $30 — a receipt claiming $50 of cash would leave
// the deposit permanently unreconcilable, and the credit liability would never
// come back down.
//
// TODO: real QuickBooks API (POST /v3/company/{realmId}/creditmemo).
// ============================================================================

export interface CreditMemoContext {
  data: QuickBooksCompanyData;
  mappings: MappingSet;
  settings: QuickBooksSettings;
  catchAllAccountId: string;
}

export interface BuiltCreditMemo {
  memo: QuickBooksCreditMemo;
  customerToCreate?: QuickBooksCustomer;
  warnings: string[];
}

/** Where a customer's unspent credit sits. Configured if the facility said so,
 *  otherwise the account that looks like it. */
function storeCreditAccount(ctx: CreditMemoContext) {
  return preferredAccount(
    ctx.data,
    ctx.settings.storeCreditAccountId,
    /store\s*credit|customer\s*credit|gift\s*card/i,
  );
}

// ── (1) Refund taken as store credit ────────────────────────────────────────

/**
 * A return the client took as credit rather than cash.
 *
 * The lines reverse the SAME income accounts the sale used, exactly as a Refund
 * Receipt would — the difference is that no bank account is touched, so the
 * balancing side is the credit the customer now holds.
 */
export function buildStoreCreditMemo(
  txn: Transaction,
  ret: Return,
  ctx: CreditMemoContext,
  credit?: StoreCredit,
): BuiltCreditMemo {
  const warnings: string[] = [];

  const customer = resolveCustomer(
    {
      customerName: ret.customerName ?? txn.customerName,
      customerEmail: ret.customerEmail ?? txn.customerEmail,
    },
    ctx.data,
  );
  if (customer.warning) warnings.push(customer.warning);
  if (customer.ref.name === "Walk-in Customer") {
    // Credit belongs to somebody. Against a walk-in it is unredeemable and the
    // liability never clears.
    warnings.push(
      "Store credit was issued with no client on file — it lands against “Walk-in Customer” and can't be redeemed.",
    );
  }

  const taxCode = ctx.data.taxCodes.find((t) => t.Taxable);
  const taxCodeRef = taxCode
    ? { value: taxCode.Id, name: taxCode.Name }
    : undefined;

  const lines: QuickBooksSalesLine[] = [];
  for (const item of ret.items) {
    const mapping = ctx.mappings[`product:${item.productId}`];
    if (!isMapped(mapping)) {
      warnings.push(
        `"${item.productName}" isn't mapped to a QuickBooks account — credited against Yipyy Unassigned Income.`,
      );
    }
    lines.push({
      LineNum: lines.length + 1,
      Description: item.variantName
        ? `${item.productName} (${item.variantName})`
        : item.productName,
      Amount: toDollars(toCents(item.total)),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: mapping?.itemId
          ? {
              value: mapping.itemId,
              name: ctx.data.items.find((i) => i.Id === mapping.itemId)?.Name,
            }
          : { value: "unassigned", name: item.productName },
        ItemAccountRef: accountRef(
          ctx.data,
          mapping?.accountId ?? ctx.catchAllAccountId,
        ),
        UnitPrice: item.unitPrice,
        Qty: item.quantity,
        TaxCodeRef: taxCodeRef,
      },
    });
  }

  const creditCents = toCents(
    credit?.amount ?? ret.storeCreditAmount ?? ret.refundTotal,
  );
  const goodsCents = lineTotalCents(lines);
  const originalSubtotalCents = toCents(txn.subtotal);
  const originalTaxCents = toCents(txn.taxTotal ?? 0);
  const proportionalTaxCents =
    originalSubtotalCents > 0
      ? Math.round((originalTaxCents * goodsCents) / originalSubtotalCents)
      : 0;
  const taxCents = Math.min(
    Math.max(0, creditCents - goodsCents),
    proportionalTaxCents,
  );

  appendRoundingLine(
    lines,
    creditCents - (goodsCents + taxCents),
    ctx.data,
    warnings,
    "Credit adjustment",
  );

  if (!storeCreditAccount(ctx)) {
    warnings.push(
      "No store-credit account is set — this credit has nowhere to sit as a liability.",
    );
  }

  const memo: QuickBooksCreditMemo = {
    DocNumber: ret.returnNumber,
    TxnDate: (ret.completedAt ?? ret.createdAt).slice(0, 10),
    CustomerRef: customer.ref,
    CurrencyRef: { value: "CAD" },
    Line: lines,
    TxnTaxDetail:
      taxCents > 0
        ? { TxnTaxCodeRef: taxCodeRef, TotalTax: toDollars(taxCents) }
        : undefined,
    // `creditCents` is ALREADY in cents — passing it back through toCents()
    // multiplied every unspent balance by a hundred.
    RemainingCredit: toDollars(credit ? toCents(credit.balance) : creditCents),
    CustomerMemo: { value: `Store credit from return ${ret.returnNumber}` },
    PrivateNote: [
      `Store credit issued for Yipyy ${txn.transactionNumber}`,
      `Return ${ret.returnNumber}`,
      credit?.expiresAt
        ? `Expires ${credit.expiresAt.slice(0, 10)}`
        : undefined,
    ]
      .filter(Boolean)
      .join(" | "),
    TotalAmt: toDollars(creditCents),
  };

  return { memo, customerToCreate: customer.create, warnings };
}

// ── (2) Store credit applied to a sale ──────────────────────────────────────

export interface StoreCreditApplication {
  amount: number;
  /** The Credit Memo this draws down, when Yipyy knows which one. */
  memoDocumentId?: string;
  memoDocumentNumber?: string;
}

/** How much of a transaction was settled with store credit. */
export function storeCreditTendered(txn: Transaction): number {
  const splits = (txn.payments ?? [])
    .filter((p) => p.method === "store_credit")
    .reduce((sum, p) => sum + p.amount, 0);
  if (splits > 0) return splits;
  return txn.paymentMethod === "store_credit" ? txn.total : 0;
}

/**
 * Fold applied store credit into the sale's Sales Receipt.
 *
 * Returns a NEW receipt — the original builder stays untouched and still
 * satisfies its own invariant. The negative line draws the credit liability
 * down and the receipt's total becomes what was actually banked, which is the
 * number that has to match the day's deposit.
 *
 * Lines + tax still equal TotalAmt afterwards, so `receiptBalances` holds; what
 * changes is the meaning of TotalAmt — revenue before, cash collected after.
 */
export function applyStoreCreditToReceipt(
  receipt: QuickBooksSalesReceipt,
  application: StoreCreditApplication,
  ctx: Pick<CreditMemoContext, "data" | "settings">,
): { receipt: QuickBooksSalesReceipt; warnings: string[] } {
  const warnings: string[] = [];
  const appliedCents = Math.min(
    toCents(application.amount),
    toCents(receipt.TotalAmt),
  );
  if (appliedCents <= 0) return { receipt, warnings };

  const creditAccount = preferredAccount(
    ctx.data,
    ctx.settings.storeCreditAccountId,
    /store\s*credit|customer\s*credit|gift\s*card/i,
  );
  if (!creditAccount) {
    warnings.push(
      "No store-credit account is set — the applied credit has no account to draw down.",
    );
  }

  const reference = application.memoDocumentNumber
    ? `Store Credit Applied (Credit Memo ${application.memoDocumentNumber})`
    : "Store Credit Applied";

  const line: QuickBooksSalesLine = {
    LineNum: receipt.Line.length + 1,
    Description: reference,
    Amount: -toDollars(appliedCents),
    DetailType: "SalesItemLineDetail",
    SalesItemLineDetail: {
      ItemRef: { value: "store-credit", name: "Store Credit" },
      ItemAccountRef: creditAccount,
      Qty: 1,
    },
  };

  return {
    receipt: {
      ...receipt,
      Line: [...receipt.Line, line],
      TotalAmt: toDollars(toCents(receipt.TotalAmt) - appliedCents),
      PrivateNote: [
        receipt.PrivateNote,
        `${toDollars(appliedCents).toFixed(2)} settled with store credit`,
      ]
        .filter(Boolean)
        .join(" | "),
    },
    warnings,
  };
}

// ── (3) Writing off an uncollectable invoice ────────────────────────────────

export const BAD_DEBT_ACCOUNT_PATTERN = /bad\s*debt|uncollect/i;

/**
 * Write an invoice off.
 *
 * A Credit Memo against Bad Debt, not a deletion: deleting the invoice would
 * erase the fact that the work was done and the money was chased. The receivable
 * clears, the loss is recorded as a loss, and the history survives.
 */
export function buildWriteOffCreditMemo(
  invoice: Invoice,
  ctx: CreditMemoContext,
  options: {
    reason?: string;
    customerName?: string;
    customerEmail?: string;
  } = {},
): BuiltCreditMemo {
  const warnings: string[] = [];

  const customer = resolveCustomer(
    {
      customerName: options.customerName,
      customerEmail: options.customerEmail,
    },
    ctx.data,
  );
  if (customer.warning) warnings.push(customer.warning);

  const badDebt =
    accountRef(ctx.data, ctx.settings.badDebtAccountId) ??
    findAccountByName(ctx.data, BAD_DEBT_ACCOUNT_PATTERN);

  if (!badDebt) {
    warnings.push(
      "No Bad Debt account was found — create one in QuickBooks, or this write-off reduces income instead of recording a loss.",
    );
  }

  const writeOffCents = toCents(invoice.amountDue);
  const lines: QuickBooksSalesLine[] = [
    {
      LineNum: 1,
      Description: `Bad debt write-off — Invoice ${invoice.invoiceNumber}`,
      Amount: toDollars(writeOffCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: { value: "bad-debt", name: "Bad Debt" },
        ItemAccountRef: badDebt,
        Qty: 1,
      },
    },
  ];

  const memo: QuickBooksCreditMemo = {
    DocNumber: `WO-${invoice.invoiceNumber}`,
    TxnDate: new Date(invoice.dueDate.slice(0, 10)).toISOString().slice(0, 10),
    CustomerRef: customer.ref,
    CurrencyRef: { value: "CAD" },
    Line: lines,
    // A write-off is not spendable credit — it offsets the invoice and nothing
    // else. Leaving RemainingCredit would hand the client a balance to spend.
    RemainingCredit: 0,
    PrivateNote: [
      `Write-off of Yipyy Invoice ${invoice.invoiceNumber}`,
      options.reason ?? "Uncollectable",
      `Originally ${invoice.total.toFixed(2)}, ${invoice.amountPaid.toFixed(2)} collected`,
    ].join(" | "),
    TotalAmt: toDollars(writeOffCents),
  };

  return { memo, customerToCreate: customer.create, warnings };
}

/** RULE 5A for a credit memo. */
export function creditMemoBalances(memo: QuickBooksCreditMemo): boolean {
  const lines = lineTotalCents(memo.Line);
  const tax = toCents(memo.TxnTaxDetail?.TotalTax ?? 0);
  return lines + tax === toCents(memo.TotalAmt);
}

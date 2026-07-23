"use client";

import type { Transaction } from "@/types/retail";

import type { QuickBooksScope } from "./connection-store";
import {
  applyStoreCreditToReceipt,
  storeCreditTendered,
} from "./documents/credit-memo";
import { buildServiceSalesReceipt } from "./documents/sales-receipt";
import { syncInvoiceToQuickBooks } from "./document-sync";
import { getQuickBooksMappings } from "./mappings-store";
import {
  ensureUnassignedIncomeAccount,
  getQuickBooksData,
} from "./qb-data-cache";
import type { QuickBooksSettings } from "./settings-store";
import { quickBooksPreflight, type SyncSkipReason } from "./sync-guards";
import { enqueueSync, type SyncJob } from "./sync-engine";

// ============================================================================
// The checkout → QuickBooks hop (Phase 5.1).
//
// One entry point the payment flows call after a sale completes. It is
// deliberately fire-and-forget and deliberately unable to fail: the client has
// paid and gone, so anything that goes wrong here belongs in the sync log, not
// in the checkout screen.
// ============================================================================

/** What the activity log shows for this sale. Derived once, at enqueue time,
 *  from the transaction as it was when it completed. */
function logFields(txn: Transaction) {
  const services = txn.items
    .filter((i) => i.itemType === "service")
    .map((i) => i.productName);
  const summary =
    services.length > 0
      ? services.join(", ")
      : (txn.bookingService ??
        txn.items
          .map((i) => i.productName)
          .slice(0, 3)
          .join(", "));
  return {
    transactionDate: txn.createdAt,
    clientName: txn.customerName,
    petName: txn.petName,
    serviceSummary: summary || undefined,
  };
}

export interface CheckoutSyncOutcome {
  /** Absent when nothing was queued — see `skipped`. */
  job?: SyncJob;
  /** Why this sale wasn't queued, when it wasn't. */
  skipped?: SyncSkipReason;
  warnings: string[];
}

/** Tenders that mean "bill me later" — the money has NOT arrived, so the sale
 *  is a receivable rather than a receipt (Table 10). */
const PAY_LATER_METHODS = new Set([
  "charge_to_account",
  "add_to_booking",
  "charge_to_active_stay",
]);

/**
 * Sales Receipt or Invoice?
 *
 * "auto" follows the money rather than the paperwork: anything charged to an
 * account or a running stay is owed, not paid. The explicit rules exist for
 * facilities whose bookkeeper wants one shape for everything.
 */
export function checkoutDocumentType(
  txn: Transaction,
  settings: QuickBooksSettings,
): "sales_receipt" | "invoice" {
  if (settings.documentRule === "always_sales_receipt") return "sales_receipt";
  if (settings.documentRule === "always_invoice") return "invoice";
  return PAY_LATER_METHODS.has(txn.paymentMethod) ? "invoice" : "sales_receipt";
}

/**
 * Queue a completed checkout for QuickBooks.
 *
 * Never throws. Returns why it did nothing rather than failing, so a caller can
 * log it without having to guard the call.
 */
export function syncCheckoutToQuickBooks(
  scope: QuickBooksScope,
  txn: Transaction,
  options: {
    staffName?: string;
    bookingDate?: string;
    /** The Credit Memo store credit on this sale is drawn from, when known. */
    creditMemoNumber?: string;
  } = {},
): CheckoutSyncOutcome {
  try {
    // A sale that hasn't completed isn't a sale yet.
    if (txn.status !== "completed") {
      return { skipped: "not_paid", warnings: [] };
    }

    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return { skipped: pre.skipped, warnings: [] };
    const settings = pre.settings;

    // An unpaid sale is a receivable. Handing it to the invoice path here keeps
    // the decision in one place instead of every caller having to know.
    if (checkoutDocumentType(txn, settings) === "invoice") {
      return syncInvoiceToQuickBooks(scope, txn, {
        staffName: options.staffName,
      });
    }

    if (pre.manualOnly) {
      // Still queued — "manual only" means it doesn't send by itself, not that
      // the sale is forgotten. processQueue is driven by the facility instead.
      const job = enqueueSync(scope, {
        transactionId: txn.id,
        documentType: "sales_receipt",
        description: `${txn.customerName ?? "Walk-in"} · ${txn.transactionNumber}`,
        amount: txn.total,
        ...logFields(txn),
      });
      return { job, skipped: "manual_only", warnings: [] };
    }

    const catchAll = ensureUnassignedIncomeAccount(scope);
    const data = getQuickBooksData(scope);
    const built = buildServiceSalesReceipt(txn, {
      data,
      mappings: getQuickBooksMappings(scope),
      settings,
      catchAllAccountId: catchAll.Id,
      staffName: options.staffName,
      bookingDate: options.bookingDate,
    });
    const warnings = [...built.warnings];

    // Store credit spent on this sale draws the liability down and reduces what
    // was actually banked. Without this the receipt claims cash the facility
    // never received, and the credit balance never clears.
    const creditApplied = storeCreditTendered(txn);
    if (creditApplied > 0) {
      const applied = applyStoreCreditToReceipt(
        built.receipt,
        { amount: creditApplied, memoDocumentNumber: options.creditMemoNumber },
        { data, settings },
      );
      warnings.push(...applied.warnings);
    }

    const job = enqueueSync(scope, {
      transactionId: txn.id,
      documentType: "sales_receipt",
      description: `${txn.customerName ?? "Walk-in"} · ${txn.transactionNumber}`,
      amount: txn.total,
      ...logFields(txn),
    });

    return { job, warnings };
  } catch {
    // The last line of defence for THE RULE: a bookkeeping bug must never
    // surface as a failed checkout.
    return { warnings: ["QuickBooks sync couldn't be queued for this sale."] };
  }
}

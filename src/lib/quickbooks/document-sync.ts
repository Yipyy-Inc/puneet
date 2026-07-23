"use client";

import type { Invoice } from "@/types/payments";
import type { Return, StoreCredit, Transaction } from "@/types/retail";

import type { QuickBooksScope } from "./connection-store";
import {
  buildStoreCreditMemo,
  buildWriteOffCreditMemo,
} from "./documents/credit-memo";
import {
  buildBookingInvoice,
  buildInvoicePayment,
  type InvoicePaymentInput,
} from "./documents/invoice";
import { buildRefundReceipt } from "./documents/refund-receipt";
import { getQuickBooksMappings } from "./mappings-store";
import {
  ensureUnassignedIncomeAccount,
  getQuickBooksData,
} from "./qb-data-cache";
import { quickBooksPreflight, type SyncSkipReason } from "./sync-guards";
import { enqueueSync, type SyncJob } from "./sync-engine";
import { existingDocumentFor, idempotencyKeyFor } from "./sync-engine";

// ============================================================================
// Enqueue points for the non-checkout documents (Phase 6).
//
// Each one is named after the Yipyy event that causes it, not after the
// QuickBooks entity it produces — the caller knows a refund happened, not that
// a Refund Receipt is the right answer. Deciding that is this file's job.
//
// All of them obey THE RULE: never throw, never block. A refund the client has
// already been given cannot be undone because bookkeeping had an opinion.
// ============================================================================

export interface DocumentSyncOutcome {
  job?: SyncJob;
  skipped?: SyncSkipReason;
  warnings: string[];
}

const NOTHING = (skipped: SyncSkipReason): DocumentSyncOutcome => ({
  skipped,
  warnings: [],
});

// ── Refunds ─────────────────────────────────────────────────────────────────

/**
 * A Yipyy return reached QuickBooks.
 *
 * The refund METHOD picks the document: money that left the business is a
 * Refund Receipt, credit the client keeps is a Credit Memo. Sending a Refund
 * Receipt for store credit would show cash leaving a bank account that never
 * moved.
 */
export function syncReturnToQuickBooks(
  scope: QuickBooksScope,
  txn: Transaction,
  ret: Return,
  options: { storeCredit?: StoreCredit; originalDocumentNumber?: string } = {},
): DocumentSyncOutcome {
  try {
    // A return still awaiting approval hasn't refunded anything yet.
    if (ret.status !== "completed") return NOTHING("not_paid");

    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const takesCredit = ret.refundMethod === "store_credit";
    const documentType = takesCredit ? "credit_memo" : "refund_receipt";
    const amount = takesCredit
      ? (options.storeCredit?.amount ??
        ret.storeCreditAmount ??
        ret.refundTotal)
      : ret.refundTotal;

    const enqueue = () =>
      enqueueSync(scope, {
        transactionId: ret.id,
        documentType,
        description: `${ret.customerName ?? "Walk-in"} · Return ${ret.returnNumber}`,
        amount,
        transactionDate: ret.completedAt ?? ret.createdAt,
        clientName: ret.customerName,
        serviceSummary: takesCredit
          ? `Store credit · ${ret.transactionNumber}`
          : `Refund · ${ret.transactionNumber}`,
      });

    if (pre.manualOnly)
      return { job: enqueue(), skipped: "manual_only", warnings: [] };

    const base = {
      data: getQuickBooksData(scope),
      mappings: getQuickBooksMappings(scope),
      settings: pre.settings,
      catchAllAccountId: ensureUnassignedIncomeAccount(scope).Id,
    };

    // Built now so its warnings reach the log at enqueue time, the same way the
    // checkout path does.
    const { warnings } = takesCredit
      ? buildStoreCreditMemo(txn, ret, base, options.storeCredit)
      : buildRefundReceipt(txn, ret, {
          ...base,
          originalDocumentNumber: options.originalDocumentNumber,
          // The original sale's posted document, when it made it there — turns
          // the memo reference into a real QuickBooks link.
          originalDocumentId: existingDocumentFor(
            scope,
            idempotencyKeyFor(txn.id, "sales_receipt"),
          )?.quickBooksDocumentId,
        });

    return { job: enqueue(), warnings };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this refund."],
    };
  }
}

// ── Invoices ────────────────────────────────────────────────────────────────

/**
 * A booking left with money outstanding.
 *
 * `amountPaid` is what was collected up front — a deposit stays visible as its
 * own Payment rather than being netted off the invoice.
 */
export function syncInvoiceToQuickBooks(
  scope: QuickBooksScope,
  txn: Transaction,
  options: {
    amountPaid?: number;
    dueDate?: string;
    dueDays?: number;
    staffName?: string;
  } = {},
): DocumentSyncOutcome {
  try {
    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const enqueue = () =>
      enqueueSync(scope, {
        transactionId: txn.id,
        documentType: "invoice",
        description: `${txn.customerName ?? "Walk-in"} · ${txn.transactionNumber}`,
        amount: txn.total,
        transactionDate: txn.createdAt,
        clientName: txn.customerName,
        petName: txn.petName,
        serviceSummary:
          txn.items
            .filter((i) => i.itemType === "service")
            .map((i) => i.productName)
            .join(", ") ||
          txn.bookingService ||
          undefined,
      });

    if (pre.manualOnly)
      return { job: enqueue(), skipped: "manual_only", warnings: [] };

    const { warnings } = buildBookingInvoice(
      txn,
      {
        data: getQuickBooksData(scope),
        mappings: getQuickBooksMappings(scope),
        settings: pre.settings,
        catchAllAccountId: ensureUnassignedIncomeAccount(scope).Id,
        dueDate: options.dueDate,
        dueDays: options.dueDays,
        staffName: options.staffName,
      },
      options.amountPaid ?? 0,
    );

    return { job: enqueue(), warnings };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this invoice."],
    };
  }
}

/**
 * Money came in against an invoice.
 *
 * Partial or final is arithmetic, not a flag — `balanceBefore` decides, and
 * QuickBooks marks the invoice Paid when the balance reaches zero.
 */
export function syncInvoicePaymentToQuickBooks(
  scope: QuickBooksScope,
  payment: InvoicePaymentInput & { paymentId: string },
): DocumentSyncOutcome {
  try {
    if (payment.amount <= 0) return NOTHING("nothing_to_sync");

    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const built = buildInvoicePayment(payment, {
      data: getQuickBooksData(scope),
      settings: pre.settings,
    });

    const job = enqueueSync(scope, {
      // Keyed on the PAYMENT: two instalments against one invoice are two
      // documents, and keying on the invoice would silently drop the second.
      transactionId: payment.paymentId,
      documentType: "payment",
      description: `${payment.customerName ?? "Client"} · ${
        built.settlesInvoice ? "Final payment" : "Partial payment"
      }${payment.invoiceNumber ? ` · Invoice ${payment.invoiceNumber}` : ""}`,
      amount: payment.amount,
      transactionDate: payment.paymentDate,
      clientName: payment.customerName,
      serviceSummary: built.settlesInvoice
        ? "Invoice settled"
        : `Partial — ${built.balanceAfter.toFixed(2)} still due`,
    });

    return {
      job,
      skipped: pre.manualOnly ? "manual_only" : undefined,
      warnings: built.warnings,
    };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this payment."],
    };
  }
}

/**
 * An invoice was given up on.
 *
 * Not wired to a Yipyy trigger yet — nothing in the product writes a
 * receivable off today. The entry point exists so that when it does, the
 * accounting decision is already made and reviewable.
 */
export function syncInvoiceWriteOffToQuickBooks(
  scope: QuickBooksScope,
  invoice: Invoice,
  options: {
    reason?: string;
    customerName?: string;
    customerEmail?: string;
  } = {},
): DocumentSyncOutcome {
  try {
    if (invoice.amountDue <= 0) return NOTHING("nothing_to_sync");

    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const { warnings } = buildWriteOffCreditMemo(
      invoice,
      {
        data: getQuickBooksData(scope),
        mappings: getQuickBooksMappings(scope),
        settings: pre.settings,
        catchAllAccountId: ensureUnassignedIncomeAccount(scope).Id,
      },
      options,
    );

    const job = enqueueSync(scope, {
      transactionId: `writeoff:${invoice.id}`,
      documentType: "credit_memo",
      description: `Write-off · Invoice ${invoice.invoiceNumber}`,
      amount: invoice.amountDue,
      transactionDate: invoice.dueDate,
      clientName: options.customerName,
      serviceSummary: `Bad debt · Invoice ${invoice.invoiceNumber}`,
    });

    return { job, warnings };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this write-off."],
    };
  }
}

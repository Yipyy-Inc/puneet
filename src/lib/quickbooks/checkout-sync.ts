"use client";

import type { Transaction } from "@/types/retail";

import {
  getQuickBooksConnection,
  type QuickBooksScope,
} from "./connection-store";
import { buildServiceSalesReceipt } from "./documents/sales-receipt";
import { getQuickBooksMappings } from "./mappings-store";
import {
  ensureUnassignedIncomeAccount,
  getQuickBooksData,
} from "./qb-data-cache";
import { getQuickBooksSettings } from "./settings-store";
import { enqueueSync, type SyncJob } from "./sync-engine";
import { getQuickBooksSetup } from "./setup-store";

// ============================================================================
// The checkout → QuickBooks hop (Phase 5.1).
//
// One entry point the payment flows call after a sale completes. It is
// deliberately fire-and-forget and deliberately unable to fail: the client has
// paid and gone, so anything that goes wrong here belongs in the sync log, not
// in the checkout screen.
// ============================================================================

export interface CheckoutSyncOutcome {
  /** Absent when nothing was queued — see `skipped`. */
  job?: SyncJob;
  /** Why this sale wasn't queued, when it wasn't. */
  skipped?: "not_connected" | "setup_incomplete" | "not_paid" | "manual_only";
  warnings: string[];
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
  options: { staffName?: string; bookingDate?: string } = {},
): CheckoutSyncOutcome {
  try {
    // A sale that hasn't completed isn't a sale yet.
    if (txn.status !== "completed") {
      return { skipped: "not_paid", warnings: [] };
    }

    const connection = getQuickBooksConnection(scope);
    if (connection.status === "disconnected") {
      return { skipped: "not_connected", warnings: [] };
    }

    const setup = getQuickBooksSetup(scope);
    if (!setup.setupComplete) {
      return { skipped: "setup_incomplete", warnings: [] };
    }

    const settings = getQuickBooksSettings(scope);
    if (settings.syncTrigger === "manual") {
      // Still queued — "manual only" means it doesn't send by itself, not that
      // the sale is forgotten. processQueue is driven by the facility instead.
      const job = enqueueSync(scope, {
        transactionId: txn.id,
        documentType: "sales_receipt",
        description: `${txn.customerName ?? "Walk-in"} · ${txn.transactionNumber}`,
        amount: txn.total,
      });
      return { job, skipped: "manual_only", warnings: [] };
    }

    const catchAll = ensureUnassignedIncomeAccount(scope);
    const { warnings } = buildServiceSalesReceipt(txn, {
      data: getQuickBooksData(scope),
      mappings: getQuickBooksMappings(scope),
      settings,
      catchAllAccountId: catchAll.Id,
      staffName: options.staffName,
      bookingDate: options.bookingDate,
    });

    const job = enqueueSync(scope, {
      transactionId: txn.id,
      documentType: "sales_receipt",
      description: `${txn.customerName ?? "Walk-in"} · ${txn.transactionNumber}`,
      amount: txn.total,
    });

    return { job, warnings };
  } catch {
    // The last line of defence for THE RULE: a bookkeeping bug must never
    // surface as a failed checkout.
    return { warnings: ["QuickBooks sync couldn't be queued for this sale."] };
  }
}

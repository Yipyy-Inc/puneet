"use client";

import type { CustomerPackageRecord } from "@/data/customer-packages";
import { groomingPrepaidPackages } from "@/data/grooming-prepaid-packages";
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
import {
  buildDepositReceipt,
  buildDepositRefundReceipt,
  type DepositInput,
} from "./documents/deposit";
import {
  buildGiftCardBreakageEntry,
  buildGiftCardRedemptionReceipt,
  buildGiftCardSaleReceipt,
  type GiftCardBreakageInput,
  type GiftCardRedemptionInput,
  type GiftCardSaleInput,
} from "./documents/gift-card";
import {
  buildMembershipCancellation,
  buildMembershipReceipt,
  membershipPeriodLabel,
  type MembershipCancellationInput,
  type MembershipChargeInput,
} from "./documents/membership";
import {
  buildPackageRedemptionReceipt,
  buildPackageSaleReceipt,
  type PackageRedemptionInput,
  type PackageSaleInput,
} from "./documents/package";
import { buildRefundReceipt } from "./documents/refund-receipt";
import { getQuickBooksMappings } from "./mappings-store";
import {
  ensureUnassignedIncomeAccount,
  getQuickBooksData,
} from "./qb-data-cache";
import { quickBooksPreflight, type SyncSkipReason } from "./sync-guards";
import { enqueueSync, processQueue, type SyncJob } from "./sync-engine";
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

/**
 * Advance the queue after a realtime enqueue, so a job reaches Synced without a
 * manual push. Fire-and-forget and never awaited — processQueue can't throw, so
 * a sync problem can never reach the operation that already happened. In manual
 * mode nothing is kicked: the facility drives the queue themselves.
 */
function kickRealtime(scope: QuickBooksScope, manualOnly: boolean): void {
  if (!manualOnly) void processQueue(scope).catch(() => {});
}

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

    const job = enqueue();
    kickRealtime(scope, pre.manualOnly);
    return { job, warnings };
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

    const job = enqueue();
    kickRealtime(scope, pre.manualOnly);
    return { job, warnings };
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

    kickRealtime(scope, pre.manualOnly);
    return { job, warnings };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this write-off."],
    };
  }
}

// ── Packages ────────────────────────────────────────────────────────────────

/** A prepaid package was bought. Revenue is recognised here and nowhere else. */
export function syncPackageSaleToQuickBooks(
  scope: QuickBooksScope,
  sale: PackageSaleInput,
): DocumentSyncOutcome {
  try {
    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const { warnings } = buildPackageSaleReceipt(sale, {
      data: getQuickBooksData(scope),
      mappings: getQuickBooksMappings(scope),
      settings: pre.settings,
      catchAllAccountId: ensureUnassignedIncomeAccount(scope).Id,
    });

    const job = enqueueSync(scope, {
      transactionId: sale.customerPackageId,
      documentType: "sales_receipt",
      description: `${sale.customerName ?? "Walk-in"} · ${sale.packageName}`,
      amount: sale.packagePrice + (sale.taxAmount ?? 0),
      transactionDate: sale.purchasedAt,
      clientName: sale.customerName,
      serviceSummary: `Package · ${sale.packageName}`,
    });

    kickRealtime(scope, pre.manualOnly);
    return {
      job,
      skipped: pre.manualOnly ? "manual_only" : undefined,
      warnings,
    };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this package sale."],
    };
  }
}

/**
 * A pass was redeemed.
 *
 * Queued even though it moves no money: the $0 receipt is what tells the
 * facility (and their accountant) that the service was delivered against a
 * package rather than given away.
 */
export function syncPackageRedemptionToQuickBooks(
  scope: QuickBooksScope,
  redemption: PackageRedemptionInput,
): DocumentSyncOutcome {
  try {
    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const { warnings } = buildPackageRedemptionReceipt(redemption, {
      data: getQuickBooksData(scope),
      mappings: getQuickBooksMappings(scope),
      settings: pre.settings,
      catchAllAccountId: ensureUnassignedIncomeAccount(scope).Id,
    });

    const job = enqueueSync(scope, {
      // Keyed on the redemption, not the package: a five-pass package redeems
      // five times, and keying on the package would record only the first.
      transactionId: redemption.redemptionId,
      documentType: "sales_receipt",
      description: `${redemption.customerName ?? "Client"} · Pass ${redemption.passNumber}/${redemption.passesTotal} · ${redemption.packageName}`,
      amount: 0,
      transactionDate: redemption.redeemedAt,
      clientName: redemption.customerName,
      petName: redemption.petName,
      serviceSummary: `${redemption.serviceName} (package pass)`,
    });

    kickRealtime(scope, pre.manualOnly);
    return {
      job,
      skipped: pre.manualOnly ? "manual_only" : undefined,
      warnings,
    };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this redemption."],
    };
  }
}

/**
 * Adapter for the three `redeemPackagePass` call sites.
 *
 * They each know a customer package and how many passes are left; none of them
 * should have to know what a QuickBooks redemption document needs. The pass
 * number is derived from what redeemPackagePass returned rather than read back
 * off the record, so it matches the redemption row that call actually created.
 */
export function syncRedeemedPassToQuickBooks(
  scope: QuickBooksScope,
  pkg: CustomerPackageRecord,
  result: { passesLeft: number },
  extras: {
    serviceName?: string;
    servicePrice?: number;
    serviceId?: string;
    petName?: string;
    bookingId?: number;
    customerName?: string;
    customerEmail?: string;
  } = {},
): DocumentSyncOutcome {
  try {
    const passNumber = pkg.passesTotal - result.passesLeft;
    const catalog = groomingPrepaidPackages.find((p) => p.id === pkg.packageId);
    const catalogService = catalog?.services[0];

    return syncPackageRedemptionToQuickBooks(scope, {
      customerPackageId: pkg.id,
      packageName: pkg.packageName,
      redemptionId: `red-${pkg.id}-${passNumber}`,
      serviceId: extras.serviceId ?? catalogService?.serviceId,
      serviceName:
        extras.serviceName ??
        catalogService?.serviceName ??
        pkg.passes[0]?.serviceName ??
        pkg.packageName,
      // The per-session price the package was priced against. Without it the
      // redemption would show a $0 service, which tells nobody what was given.
      servicePrice: extras.servicePrice ?? catalogService?.pricePerSession ?? 0,
      redeemedAt: new Date().toISOString(),
      passNumber,
      passesTotal: pkg.passesTotal,
      bookingId: extras.bookingId,
      petName: extras.petName,
      customerName: extras.customerName,
      customerEmail: extras.customerEmail,
    });
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this redemption."],
    };
  }
}

// ── Gift cards ──────────────────────────────────────────────────────────────

/** A gift card was sold. Posts to the liability, never income (5C). */
export function syncGiftCardSaleToQuickBooks(
  scope: QuickBooksScope,
  sale: GiftCardSaleInput,
): DocumentSyncOutcome {
  try {
    if (sale.amount <= 0) return NOTHING("nothing_to_sync");

    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const { warnings } = buildGiftCardSaleReceipt(sale, {
      data: getQuickBooksData(scope),
      mappings: getQuickBooksMappings(scope),
      settings: pre.settings,
      catchAllAccountId: ensureUnassignedIncomeAccount(scope).Id,
    });

    const job = enqueueSync(scope, {
      transactionId: `giftcard:${sale.giftCardId}`,
      documentType: "sales_receipt",
      description:
        `${sale.customerName ?? "Walk-in"} · Gift card ${sale.code ?? ""}`.trim(),
      amount: sale.amount,
      transactionDate: sale.purchasedAt,
      clientName: sale.customerName,
      serviceSummary: "Gift card sale",
    });

    kickRealtime(scope, pre.manualOnly);
    return {
      job,
      skipped: pre.manualOnly ? "manual_only" : undefined,
      warnings,
    };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this gift card."],
    };
  }
}

/** A gift card paid for something — where the revenue finally lands. */
export function syncGiftCardRedemptionToQuickBooks(
  scope: QuickBooksScope,
  redemption: GiftCardRedemptionInput,
): DocumentSyncOutcome {
  try {
    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const { warnings } = buildGiftCardRedemptionReceipt(redemption, {
      data: getQuickBooksData(scope),
      mappings: getQuickBooksMappings(scope),
      settings: pre.settings,
      catchAllAccountId: ensureUnassignedIncomeAccount(scope).Id,
    });

    const job = enqueueSync(scope, {
      transactionId: `giftcard-redemption:${redemption.redemptionId}`,
      documentType: "sales_receipt",
      description: `${redemption.customerName ?? "Client"} · Paid by gift card`,
      amount: redemption.servicePrice + (redemption.taxAmount ?? 0),
      transactionDate: redemption.redeemedAt,
      clientName: redemption.customerName,
      petName: redemption.petName,
      serviceSummary: `${redemption.serviceName} (gift card)`,
    });

    kickRealtime(scope, pre.manualOnly);
    return {
      job,
      skipped: pre.manualOnly ? "manual_only" : undefined,
      warnings,
    };
  } catch {
    return {
      warnings: [
        "QuickBooks sync couldn't be queued for this gift-card redemption.",
      ],
    };
  }
}

/**
 * A gift card expired with a balance on it.
 *
 * Nothing calls this automatically. Recognising breakage is a policy decision
 * with legal weight — several jurisdictions don't allow gift cards to expire at
 * all — so it stays a deliberate act.
 */
export function syncGiftCardBreakageToQuickBooks(
  scope: QuickBooksScope,
  breakage: GiftCardBreakageInput,
): DocumentSyncOutcome {
  try {
    if (breakage.balance <= 0) return NOTHING("nothing_to_sync");

    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const { warnings } = buildGiftCardBreakageEntry(breakage, {
      data: getQuickBooksData(scope),
      settings: pre.settings,
    });

    const job = enqueueSync(scope, {
      transactionId: `breakage:${breakage.giftCardId}`,
      documentType: "journal_entry",
      description: `Gift card ${breakage.code ?? breakage.giftCardId} expired`,
      amount: breakage.balance,
      transactionDate: breakage.expiredAt,
      serviceSummary: "Gift card breakage",
    });

    kickRealtime(scope, pre.manualOnly);
    return {
      job,
      skipped: pre.manualOnly ? "manual_only" : undefined,
      warnings,
    };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this breakage."],
    };
  }
}

// ── Memberships ─────────────────────────────────────────────────────────────

/** One period of a membership was billed. */
export function syncMembershipChargeToQuickBooks(
  scope: QuickBooksScope,
  charge: MembershipChargeInput,
): DocumentSyncOutcome {
  try {
    if (charge.amount <= 0) return NOTHING("nothing_to_sync");

    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const { warnings } = buildMembershipReceipt(charge, {
      data: getQuickBooksData(scope),
      mappings: getQuickBooksMappings(scope),
      settings: pre.settings,
      catchAllAccountId: ensureUnassignedIncomeAccount(scope).Id,
    });

    const job = enqueueSync(scope, {
      // Keyed on the CHARGE, so twelve months of one membership are twelve
      // documents rather than one that keeps getting deduplicated away.
      transactionId: `membership:${charge.chargeId}`,
      documentType: "sales_receipt",
      description: `${charge.customerName ?? "Client"} · ${charge.planName}${
        charge.isRenewal ? " (renewal)" : ""
      }`,
      amount: charge.amount + (charge.taxAmount ?? 0),
      transactionDate: charge.chargedAt,
      clientName: charge.customerName,
      serviceSummary: `${charge.planName} · ${membershipPeriodLabel(
        charge.periodStart,
        charge.cycle,
      )}`,
    });

    kickRealtime(scope, pre.manualOnly);
    return {
      job,
      skipped: pre.manualOnly ? "manual_only" : undefined,
      warnings,
    };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this membership."],
    };
  }
}

/**
 * A membership was cancelled.
 *
 * Returns `nothing_to_sync` when no refund is due — that is the correct
 * outcome, not a failure: the client keeps the period they paid for and
 * nothing moved.
 */
export function syncMembershipCancellationToQuickBooks(
  scope: QuickBooksScope,
  cancellation: MembershipCancellationInput,
): DocumentSyncOutcome {
  try {
    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const outcome = buildMembershipCancellation(cancellation, {
      data: getQuickBooksData(scope),
      mappings: getQuickBooksMappings(scope),
      settings: pre.settings,
      catchAllAccountId: ensureUnassignedIncomeAccount(scope).Id,
    });

    if (outcome.kind === "no_entry") {
      return { skipped: "nothing_to_sync", warnings: [] };
    }

    const job = enqueueSync(scope, {
      transactionId: `membership-refund:${cancellation.chargeId}`,
      documentType: "refund_receipt",
      description: `${cancellation.customerName ?? "Client"} · ${cancellation.planName} cancelled`,
      amount: outcome.refund.TotalAmt,
      transactionDate: cancellation.cancelledAt,
      clientName: cancellation.customerName,
      serviceSummary: `Pro-rated refund · ${cancellation.planName}`,
    });

    return {
      job,
      skipped: pre.manualOnly ? "manual_only" : undefined,
      warnings: outcome.warnings,
    };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this cancellation."],
    };
  }
}

// ── Deposits ────────────────────────────────────────────────────────────────

/** A deposit was taken before the stay. Posts to a liability, not income. */
export function syncDepositToQuickBooks(
  scope: QuickBooksScope,
  deposit: DepositInput,
): DocumentSyncOutcome {
  try {
    if (deposit.amount <= 0) return NOTHING("nothing_to_sync");

    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const { warnings } = buildDepositReceipt(deposit, {
      data: getQuickBooksData(scope),
      mappings: getQuickBooksMappings(scope),
      settings: pre.settings,
    });

    const job = enqueueSync(scope, {
      transactionId: `deposit:${deposit.depositId}`,
      documentType: "sales_receipt",
      description: `${deposit.customerName ?? "Client"} · Booking deposit`,
      amount: deposit.amount,
      transactionDate: deposit.collectedAt,
      clientName: deposit.customerName,
      petName: deposit.petName,
      serviceSummary: deposit.serviceName
        ? `Deposit · ${deposit.serviceName}`
        : "Booking deposit",
    });

    kickRealtime(scope, pre.manualOnly);
    return {
      job,
      skipped: pre.manualOnly ? "manual_only" : undefined,
      warnings,
    };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this deposit."],
    };
  }
}

/** The booking fell through and the deposit went back. */
export function syncDepositRefundToQuickBooks(
  scope: QuickBooksScope,
  deposit: DepositInput & { refundedAt?: string; reason?: string },
): DocumentSyncOutcome {
  try {
    if (deposit.amount <= 0) return NOTHING("nothing_to_sync");

    const pre = quickBooksPreflight(scope);
    if (!pre.ok) return NOTHING(pre.skipped);

    const { warnings } = buildDepositRefundReceipt(deposit, {
      data: getQuickBooksData(scope),
      mappings: getQuickBooksMappings(scope),
      settings: pre.settings,
    });

    const job = enqueueSync(scope, {
      transactionId: `deposit-refund:${deposit.depositId}`,
      documentType: "refund_receipt",
      description: `${deposit.customerName ?? "Client"} · Deposit refunded`,
      amount: deposit.amount,
      transactionDate: deposit.refundedAt ?? deposit.collectedAt,
      clientName: deposit.customerName,
      petName: deposit.petName,
      serviceSummary: "Deposit refund",
    });

    kickRealtime(scope, pre.manualOnly);
    return {
      job,
      skipped: pre.manualOnly ? "manual_only" : undefined,
      warnings,
    };
  } catch {
    return {
      warnings: ["QuickBooks sync couldn't be queued for this deposit refund."],
    };
  }
}

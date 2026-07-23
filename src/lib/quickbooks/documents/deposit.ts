import type {
  QuickBooksCompanyData,
  QuickBooksCustomer,
  QuickBooksRef,
  QuickBooksRefundReceipt,
  QuickBooksSalesLine,
  QuickBooksSalesReceipt,
} from "@/types/quickbooks";

import type { MappingSet } from "../mappings-store";
import type { QuickBooksSettings } from "../settings-store";
import {
  accountRef,
  findAccountByName,
  preferredAccount,
  resolveCustomer,
  toCents,
  toDollars,
  toQuickBooksPaymentMethod,
} from "./shared";

// ============================================================================
// Booking deposits (Table 8 / 5E).
//
// A deposit is money the facility HOLDS, not money it has earned. The stay
// hasn't happened; if the client cancels, the money may go back. So it posts to
// a liability — Deposits Held — and stays there until checkout turns it into
// revenue.
//
// RULE 5E, which the scenario check at the bottom of this file exists to prove:
//
//   (deposit Sales Receipt) + (deposit applied credit) must NET TO ZERO in
//   Deposits Held, and after checkout the FULL service price must be sitting in
//   income — not the service minus the deposit.
//
// Get this wrong in the obvious way — treat the deposit as income on day one —
// and the facility pays tax on money it may have to hand back, then under-reports
// the stay it actually delivered. Get it wrong the other obvious way — invoice
// only the balance at checkout — and Deposits Held grows forever with money
// that was earned months ago.
//
// TODO: real QuickBooks API (POST …/salesreceipt, POST …/refundreceipt).
// ============================================================================

export const DEPOSITS_HELD_PATTERN = /deposit/i;
export const DEPOSIT_ITEM_NAME = "Booking Deposit";
export const DEPOSIT_APPLIED_LINE = "Booking Deposit Applied";

export interface DepositContext {
  data: QuickBooksCompanyData;
  mappings: MappingSet;
  settings: QuickBooksSettings;
}

/** The liability deposits sit in. Configured wins; otherwise the account that
 *  looks like it, and if neither exists the caller is warned rather than
 *  quietly dropping the money into income. */
export function depositsHeldAccount(
  ctx: Pick<DepositContext, "data" | "settings">,
): QuickBooksRef | undefined {
  const configured = ctx.settings.depositsHeldAccountId;
  if (configured) return accountRef(ctx.data, configured);

  // Deliberately not `preferredAccount`'s loose match: "Deposits Held" must be
  // a liability. A bank account called "Deposits" would be catastrophic here.
  const account = ctx.data.accounts.find(
    (a) =>
      a.Active &&
      a.Classification === "Liability" &&
      DEPOSITS_HELD_PATTERN.test(a.Name),
  );
  return account ? { value: account.Id, name: account.Name } : undefined;
}

export interface BuiltDepositReceipt {
  receipt: QuickBooksSalesReceipt;
  customerToCreate?: QuickBooksCustomer;
  warnings: string[];
}

// ── (1) Deposit collected ───────────────────────────────────────────────────

export interface DepositInput {
  /** Yipyy's id for this deposit — the idempotency anchor. */
  depositId: string;
  amount: number;
  collectedAt: string;
  bookingId?: number;
  petName?: string;
  serviceName?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  customerName?: string;
  customerEmail?: string;
}

/**
 * Money taken before the stay.
 *
 * A Sales Receipt because cash really did arrive and the bank balance really
 * does go up — but the other side is a liability, not income.
 */
export function buildDepositReceipt(
  deposit: DepositInput,
  ctx: DepositContext,
): BuiltDepositReceipt {
  const warnings: string[] = [];

  const customer = resolveCustomer(deposit, ctx.data);
  if (customer.warning) warnings.push(customer.warning);

  const held = depositsHeldAccount(ctx);
  if (!held) {
    warnings.push(
      "No “Deposits Held” liability account was found — create one in QuickBooks, or this deposit is recorded as income before the stay has happened.",
    );
  }

  const amountCents = toCents(deposit.amount);

  const lines: QuickBooksSalesLine[] = [
    {
      LineNum: 1,
      Description: [DEPOSIT_ITEM_NAME, deposit.serviceName, deposit.petName]
        .filter(Boolean)
        .join(" — "),
      Amount: toDollars(amountCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: { value: "booking-deposit", name: DEPOSIT_ITEM_NAME },
        ItemAccountRef: held,
        UnitPrice: deposit.amount,
        Qty: 1,
        // A deposit isn't a supply yet, so it isn't taxed here. Tax is charged
        // on the full service at checkout.
      },
    },
  ];

  const receipt: QuickBooksSalesReceipt = {
    DocNumber: deposit.receiptNumber,
    TxnDate: deposit.collectedAt.slice(0, 10),
    CustomerRef: customer.ref,
    DepositToAccountRef: accountRef(ctx.data, ctx.settings.depositAccountId),
    PaymentMethodRef: {
      value: toQuickBooksPaymentMethod(deposit.paymentMethod ?? ""),
    },
    CurrencyRef: { value: "CAD" },
    Line: lines,
    PrivateNote: [
      `Booking deposit ${deposit.depositId}`,
      deposit.bookingId ? `Booking #${deposit.bookingId}` : undefined,
      "Held as a liability until checkout",
    ]
      .filter(Boolean)
      .join(" | "),
    TotalAmt: toDollars(amountCents),
  };

  return { receipt, customerToCreate: customer.create, warnings };
}

// ── (2) Deposit applied at checkout ─────────────────────────────────────────

export interface DepositApplication {
  amount: number;
  depositId?: string;
  /** The receipt the deposit was taken on, for the memo trail. */
  depositReceiptNumber?: string;
}

/**
 * Fold a held deposit into the final Sales Receipt.
 *
 * The service lines stay at FULL price — that is the revenue, and it is earned
 * now. The negative line releases the liability, and what remains is what the
 * client pays today. Lines + tax still equal TotalAmt, so the receipt's own
 * invariant holds; TotalAmt now means cash collected at checkout.
 */
export function applyDepositToReceipt(
  receipt: QuickBooksSalesReceipt,
  application: DepositApplication,
  ctx: Pick<DepositContext, "data" | "settings">,
): { receipt: QuickBooksSalesReceipt; warnings: string[] } {
  const warnings: string[] = [];
  const appliedCents = Math.min(
    toCents(application.amount),
    toCents(receipt.TotalAmt),
  );
  if (appliedCents <= 0) return { receipt, warnings };

  const held = depositsHeldAccount(ctx);
  if (!held) {
    warnings.push(
      "No “Deposits Held” account — the applied deposit has no liability to release, so it will reduce income instead.",
    );
  }

  const line: QuickBooksSalesLine = {
    LineNum: receipt.Line.length + 1,
    Description: application.depositReceiptNumber
      ? `${DEPOSIT_APPLIED_LINE} (${application.depositReceiptNumber})`
      : DEPOSIT_APPLIED_LINE,
    Amount: -toDollars(appliedCents),
    DetailType: "SalesItemLineDetail",
    SalesItemLineDetail: {
      ItemRef: { value: "booking-deposit", name: DEPOSIT_ITEM_NAME },
      ItemAccountRef: held,
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
        `${toDollars(appliedCents).toFixed(2)} deposit applied`,
      ]
        .filter(Boolean)
        .join(" | "),
    },
    warnings,
  };
}

// ── (3) Deposit refunded ────────────────────────────────────────────────────

/**
 * The booking fell through and the deposit goes back.
 *
 * A Refund Receipt against the SAME liability: the money leaves the bank and
 * the obligation disappears with it. Nothing touches income in either
 * direction, because nothing was ever earned.
 */
export function buildDepositRefundReceipt(
  deposit: DepositInput & { refundedAt?: string; reason?: string },
  ctx: DepositContext,
): { refund: QuickBooksRefundReceipt; warnings: string[] } {
  const warnings: string[] = [];

  const customer = resolveCustomer(deposit, ctx.data);
  if (customer.warning) warnings.push(customer.warning);

  const held = depositsHeldAccount(ctx);
  if (!held) {
    warnings.push(
      "No “Deposits Held” account — this refund has no liability to reverse.",
    );
  }

  const amountCents = toCents(deposit.amount);

  const refund: QuickBooksRefundReceipt = {
    DocNumber: deposit.receiptNumber
      ? `REF-${deposit.receiptNumber}`
      : undefined,
    TxnDate: (deposit.refundedAt ?? deposit.collectedAt).slice(0, 10),
    CustomerRef: customer.ref,
    DepositToAccountRef:
      accountRef(ctx.data, ctx.settings.depositAccountId) ??
      preferredAccount(ctx.data, undefined, /bank|chequing|checking/i),
    PaymentMethodRef: {
      value: toQuickBooksPaymentMethod(deposit.paymentMethod ?? ""),
    },
    CurrencyRef: { value: "CAD" },
    Line: [
      {
        LineNum: 1,
        Description: `${DEPOSIT_ITEM_NAME} refunded${
          deposit.bookingId ? ` — Booking #${deposit.bookingId}` : ""
        }`,
        Amount: toDollars(amountCents),
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { value: "booking-deposit", name: DEPOSIT_ITEM_NAME },
          ItemAccountRef: held,
          UnitPrice: deposit.amount,
          Qty: 1,
        },
      },
    ],
    PrivateNote: [
      `Refund of booking deposit ${deposit.depositId}`,
      deposit.reason ?? "Booking cancelled",
      deposit.receiptNumber
        ? `Original receipt ${deposit.receiptNumber}`
        : undefined,
    ]
      .filter(Boolean)
      .join(" | "),
    TotalAmt: toDollars(amountCents),
  };

  return { refund, warnings };
}

/** Convenience for callers that only have the company data to hand. */
export function hasDepositsHeldAccount(data: QuickBooksCompanyData): boolean {
  return Boolean(
    findAccountByName(data, DEPOSITS_HELD_PATTERN) &&
    data.accounts.some(
      (a) =>
        a.Active &&
        a.Classification === "Liability" &&
        DEPOSITS_HELD_PATTERN.test(a.Name),
    ),
  );
}

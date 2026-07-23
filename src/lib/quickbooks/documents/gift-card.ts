import type {
  QuickBooksCompanyData,
  QuickBooksCustomer,
  QuickBooksJournalEntry,
  QuickBooksRef,
  QuickBooksSalesLine,
  QuickBooksSalesReceipt,
} from "@/types/quickbooks";

import { isMapped, type MappingSet } from "../mappings-store";
import type { QuickBooksSettings } from "../settings-store";
import {
  accountRef,
  findAccountByName,
  resolveCustomer,
  toCents,
  toDollars,
  toQuickBooksPaymentMethod,
} from "./shared";

// ============================================================================
// Gift cards (Table 6 / 5C).
//
// Selling a gift card is not a sale. The facility has taken money and promised
// to do work later — that is a liability, and it stays one until the card is
// spent. Booking it as income on the day it sold overstates revenue, taxes
// money that hasn't been earned, and then books the eventual service at zero,
// so the month the work actually happened looks empty.
//
//   sale       → Sales Receipt, line posted to Gift Card Liability
//   redemption → Sales Receipt at FULL price with the revenue in the service's
//                income account, paid by "Gift Card"; the liability comes down
//   breakage   → Journal Entry moving the dead balance from the liability into
//                Breakage Income. No customer, no sale — just an obligation
//                that expired.
//
// TODO: real QuickBooks API (POST …/salesreceipt, POST …/journalentry).
// ============================================================================

export const GIFT_CARD_LIABILITY_PATTERN = /gift\s*card/i;
export const BREAKAGE_INCOME_PATTERN = /breakage|forfeit|unredeem/i;
export const GIFT_CARD_ITEM_NAME = "Gift Card";

export interface GiftCardContext {
  data: QuickBooksCompanyData;
  mappings: MappingSet;
  settings: QuickBooksSettings;
  catchAllAccountId: string;
}

export interface BuiltGiftCardReceipt {
  receipt: QuickBooksSalesReceipt;
  customerToCreate?: QuickBooksCustomer;
  warnings: string[];
}

/** Where unspent gift-card money sits. Must be a liability — a "Gift Cards"
 *  income account is the exact mistake this module exists to prevent. */
export function giftCardLiabilityAccount(
  ctx: Pick<GiftCardContext, "data" | "settings">,
): QuickBooksRef | undefined {
  const configured = ctx.settings.giftCardLiabilityAccountId;
  if (configured) return accountRef(ctx.data, configured);

  const account = ctx.data.accounts.find(
    (a) =>
      a.Active &&
      a.Classification === "Liability" &&
      GIFT_CARD_LIABILITY_PATTERN.test(a.Name),
  );
  return account ? { value: account.Id, name: account.Name } : undefined;
}

// ── (1) Sale ────────────────────────────────────────────────────────────────

export interface GiftCardSaleInput {
  /** Yipyy's id for the card — the idempotency anchor. */
  giftCardId: string;
  code?: string;
  amount: number;
  purchasedAt: string;
  expiryDate?: string;
  neverExpires?: boolean;
  recipientName?: string;
  paymentMethod?: string;
  receiptNumber?: string;
  customerName?: string;
  customerEmail?: string;
}

/**
 * A gift card was sold.
 *
 * Cash arrives, so the bank goes up — but the other side is a promise, not
 * revenue. No tax either: the sale of a gift card isn't a supply, and the tax
 * is charged when the card is spent on something.
 */
export function buildGiftCardSaleReceipt(
  sale: GiftCardSaleInput,
  ctx: GiftCardContext,
): BuiltGiftCardReceipt {
  const warnings: string[] = [];

  const customer = resolveCustomer(sale, ctx.data);
  if (customer.warning) warnings.push(customer.warning);

  const liability = giftCardLiabilityAccount(ctx);
  if (!liability) {
    warnings.push(
      "No “Gift Card Liability” account was found — create one in QuickBooks, or this sale is recorded as income before anything has been delivered.",
    );
  }

  const amountCents = toCents(sale.amount);

  const receipt: QuickBooksSalesReceipt = {
    DocNumber: sale.receiptNumber,
    TxnDate: sale.purchasedAt.slice(0, 10),
    CustomerRef: customer.ref,
    DepositToAccountRef: accountRef(ctx.data, ctx.settings.depositAccountId),
    PaymentMethodRef: {
      value: toQuickBooksPaymentMethod(sale.paymentMethod ?? ""),
    },
    CurrencyRef: { value: "CAD" },
    Line: [
      {
        LineNum: 1,
        Description: [
          GIFT_CARD_ITEM_NAME,
          sale.code ? `#${sale.code}` : undefined,
          sale.recipientName ? `for ${sale.recipientName}` : undefined,
        ]
          .filter(Boolean)
          .join(" "),
        Amount: toDollars(amountCents),
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { value: "gift-card", name: GIFT_CARD_ITEM_NAME },
          ItemAccountRef: liability,
          UnitPrice: sale.amount,
          Qty: 1,
          // No TaxCodeRef: tax is charged when the card is redeemed against a
          // real service, not when the promise is made.
        },
      },
    ],
    PrivateNote: [
      `Gift card ${sale.code ?? sale.giftCardId} sold`,
      sale.neverExpires
        ? "No expiry"
        : sale.expiryDate
          ? `Expires ${sale.expiryDate.slice(0, 10)}`
          : undefined,
      "Held as a liability until redeemed",
    ]
      .filter(Boolean)
      .join(" | "),
    TotalAmt: toDollars(amountCents),
  };

  return { receipt, customerToCreate: customer.create, warnings };
}

// ── (2) Redemption ──────────────────────────────────────────────────────────

export interface GiftCardRedemptionInput {
  giftCardId: string;
  code?: string;
  /** Yipyy id of this redemption — the idempotency anchor. */
  redemptionId: string;
  /** What was bought, at its normal price. */
  serviceId?: string;
  serviceName: string;
  servicePrice: number;
  taxAmount?: number;
  redeemedAt: string;
  /** Card balance after this redemption, for the memo. */
  balanceAfter?: number;
  bookingId?: number;
  petName?: string;
  customerName?: string;
  customerEmail?: string;
  receiptNumber?: string;
}

/**
 * A gift card paid for something.
 *
 * This is where the revenue finally happens: full price into the service's
 * income account, tax charged as normal. The card is the TENDER — the payment
 * method is "Gift Card" and the liability comes down by what was spent, which
 * is what closes the loop opened at the sale.
 */
export function buildGiftCardRedemptionReceipt(
  redemption: GiftCardRedemptionInput,
  ctx: GiftCardContext,
): BuiltGiftCardReceipt {
  const warnings: string[] = [];

  const customer = resolveCustomer(redemption, ctx.data);
  if (customer.warning) warnings.push(customer.warning);

  const liability = giftCardLiabilityAccount(ctx);
  if (!liability) {
    warnings.push(
      "No “Gift Card Liability” account — the redeemed balance has no liability to draw down.",
    );
  }

  const mapping = redemption.serviceId
    ? ctx.mappings[`service:${redemption.serviceId}`]
    : undefined;
  if (!isMapped(mapping)) {
    warnings.push(
      `"${redemption.serviceName}" isn't mapped to a QuickBooks account — the redeemed revenue posts to Yipyy Unassigned Income.`,
    );
  }

  const taxCode = ctx.data.taxCodes.find((t) => t.Taxable);
  const taxCodeRef = taxCode
    ? { value: taxCode.Id, name: taxCode.Name }
    : undefined;

  const priceCents = toCents(redemption.servicePrice);
  const taxCents = toCents(redemption.taxAmount ?? 0);

  const lines: QuickBooksSalesLine[] = [
    {
      LineNum: 1,
      Description: redemption.petName
        ? `${redemption.serviceName} — ${redemption.petName}`
        : redemption.serviceName,
      Amount: toDollars(priceCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: mapping?.itemId
          ? {
              value: mapping.itemId,
              name: ctx.data.items.find((i) => i.Id === mapping.itemId)?.Name,
            }
          : { value: "unassigned", name: redemption.serviceName },
        // The REVENUE account — this is the sale the gift card was a promise of.
        ItemAccountRef: accountRef(
          ctx.data,
          mapping?.accountId ?? ctx.catchAllAccountId,
        ),
        UnitPrice: redemption.servicePrice,
        Qty: 1,
        TaxCodeRef: taxCodeRef,
      },
    },
  ];

  const receipt: QuickBooksSalesReceipt = {
    DocNumber: redemption.receiptNumber,
    TxnDate: redemption.redeemedAt.slice(0, 10),
    CustomerRef: customer.ref,
    // The card IS the bank here: money moves out of the liability, not in from
    // a card terminal. Pointing this at the bank would invent a deposit.
    DepositToAccountRef: liability,
    PaymentMethodRef: { value: GIFT_CARD_ITEM_NAME },
    CurrencyRef: { value: "CAD" },
    Line: lines,
    TxnTaxDetail:
      taxCents > 0
        ? { TxnTaxCodeRef: taxCodeRef, TotalTax: toDollars(taxCents) }
        : undefined,
    PrivateNote: [
      `Paid with gift card ${redemption.code ?? redemption.giftCardId}`,
      redemption.bookingId ? `Booking #${redemption.bookingId}` : undefined,
      redemption.balanceAfter !== undefined
        ? `Balance after: ${redemption.balanceAfter.toFixed(2)}`
        : undefined,
    ]
      .filter(Boolean)
      .join(" | "),
    TotalAmt: toDollars(priceCents + taxCents),
  };

  return { receipt, customerToCreate: customer.create, warnings };
}

// ── (2b) A gift card used as tender at the POS ──────────────────────────────

/** How much of a transaction was settled with a gift card. */
export function giftCardTendered(txn: {
  paymentMethod?: string;
  total?: number;
  payments?: { method: string; amount: number }[];
}): number {
  const splits = (txn.payments ?? [])
    .filter((p) => p.method === "gift_card")
    .reduce((sum, p) => sum + p.amount, 0);
  if (splits > 0) return splits;
  return txn.paymentMethod === "gift_card" ? (txn.total ?? 0) : 0;
}

/**
 * Fold a gift-card tender into a checkout Sales Receipt.
 *
 * The POS path already builds one receipt for the whole sale, so a second
 * redemption document would count the revenue twice. Instead the card is
 * treated as what it is — a tender: the service lines keep their full price and
 * income, a negative line draws the liability down, and the total becomes the
 * cash actually banked.
 */
export function applyGiftCardToReceipt(
  receipt: QuickBooksSalesReceipt,
  application: { amount: number; code?: string },
  ctx: Pick<GiftCardContext, "data" | "settings">,
): { receipt: QuickBooksSalesReceipt; warnings: string[] } {
  const warnings: string[] = [];
  const appliedCents = Math.min(
    toCents(application.amount),
    toCents(receipt.TotalAmt),
  );
  if (appliedCents <= 0) return { receipt, warnings };

  const liability = giftCardLiabilityAccount(ctx);
  if (!liability) {
    warnings.push(
      "No “Gift Card Liability” account — the redeemed balance has no liability to draw down, so it will reduce income instead.",
    );
  }

  const line: QuickBooksSalesLine = {
    LineNum: receipt.Line.length + 1,
    Description: application.code
      ? `Gift Card Applied (#${application.code})`
      : "Gift Card Applied",
    Amount: -toDollars(appliedCents),
    DetailType: "SalesItemLineDetail",
    SalesItemLineDetail: {
      ItemRef: { value: "gift-card", name: GIFT_CARD_ITEM_NAME },
      ItemAccountRef: liability,
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
        `${toDollars(appliedCents).toFixed(2)} paid by gift card`,
      ]
        .filter(Boolean)
        .join(" | "),
    },
    warnings,
  };
}

// ── (3) Breakage ────────────────────────────────────────────────────────────

export interface GiftCardBreakageInput {
  giftCardId: string;
  code?: string;
  /** What was never spent. */
  balance: number;
  expiredAt: string;
  reason?: string;
}

export interface BuiltBreakageEntry {
  entry: QuickBooksJournalEntry;
  warnings: string[];
}

/**
 * A card expired with money on it.
 *
 * No customer and no sale, so this is a Journal Entry: DEBIT the liability
 * (the obligation is gone) and CREDIT Breakage Income (the facility keeps it).
 *
 * Optional on purpose. Some jurisdictions forbid expiring gift cards outright,
 * and recognising breakage there would book revenue the facility may legally
 * still owe — so nothing calls this unless a facility asks for it.
 */
export function buildGiftCardBreakageEntry(
  breakage: GiftCardBreakageInput,
  ctx: Pick<GiftCardContext, "data" | "settings">,
): BuiltBreakageEntry {
  const warnings: string[] = [];

  const liability = giftCardLiabilityAccount(ctx);
  if (!liability) {
    warnings.push(
      "No “Gift Card Liability” account — there is no balance to move.",
    );
  }

  const breakageIncome =
    accountRef(ctx.data, ctx.settings.breakageIncomeAccountId) ??
    findAccountByName(ctx.data, BREAKAGE_INCOME_PATTERN);

  if (!breakageIncome) {
    warnings.push(
      "No “Breakage Income” account was found — create one, or this expiry has nowhere to go and the liability stays on the books forever.",
    );
  }

  const amountCents = toCents(breakage.balance);
  const amount = toDollars(amountCents);

  const entry: QuickBooksJournalEntry = {
    DocNumber: `BRK-${breakage.code ?? breakage.giftCardId}`,
    TxnDate: breakage.expiredAt.slice(0, 10),
    CurrencyRef: { value: "CAD" },
    Line: [
      {
        LineNum: 1,
        Description: `Gift card ${breakage.code ?? breakage.giftCardId} expired — liability released`,
        Amount: amount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          // Debit reduces a liability.
          PostingType: "Debit",
          AccountRef: liability ?? { value: "", name: "Gift Card Liability" },
        },
      },
      {
        LineNum: 2,
        Description: "Breakage income",
        Amount: amount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Credit",
          AccountRef: breakageIncome ?? { value: "", name: "Breakage Income" },
        },
      },
    ],
    PrivateNote: [
      `Gift card breakage — ${breakage.code ?? breakage.giftCardId}`,
      breakage.reason ?? "Expired unredeemed",
    ].join(" | "),
    TotalAmt: amount,
  };

  return { entry, warnings };
}

/** Debits must equal credits. Exposed so the check can assert it. */
export function journalEntryBalances(entry: QuickBooksJournalEntry): boolean {
  let debits = 0;
  let credits = 0;
  for (const line of entry.Line) {
    const cents = toCents(line.Amount);
    if (line.JournalEntryLineDetail.PostingType === "Debit") debits += cents;
    else credits += cents;
  }
  return debits === credits;
}

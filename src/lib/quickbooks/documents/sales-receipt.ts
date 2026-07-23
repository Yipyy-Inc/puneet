import type { CartItem, Transaction } from "@/types/retail";
import type {
  QuickBooksCompanyData,
  QuickBooksCustomer,
  QuickBooksRef,
  QuickBooksSalesLine,
  QuickBooksSalesReceipt,
} from "@/types/quickbooks";

import { isMapped, type MappingSet } from "../mappings-store";
import type { QuickBooksSettings } from "../settings-store";

// ============================================================================
// Table 4 — a Yipyy checkout becomes a QuickBooks Sales Receipt (Phase 5.1).
//
// Pure: transaction in, document out. No stores, no network, no React — which
// is what makes the money rules below checkable rather than hopeful.
//
// RULE 5A: the QuickBooks total must equal the Yipyy total TO THE CENT. Every
// amount here is computed in integer cents for that reason; floating-point
// dollars drift, and a receipt that disagrees with the client's card statement
// by a penny is a reconciliation problem someone has to chase by hand.
//
// TODO: real QuickBooks API (POST /v3/company/{realmId}/salesreceipt).
// ============================================================================

const CENTS = 100;

const toCents = (dollars: number): number => Math.round(dollars * CENTS);
const toDollars = (cents: number): number => cents / CENTS;

export interface SalesReceiptContext {
  data: QuickBooksCompanyData;
  mappings: MappingSet;
  settings: QuickBooksSettings;
  /** "Yipyy Unassigned Income" — where unmapped items land (3.4 RULE). */
  catchAllAccountId: string;
  /** Groomer / staff name for the memo, when the booking has one. */
  staffName?: string;
  /** Booking date for the memo, when it differs from the payment date. */
  bookingDate?: string;
}

export interface BuiltSalesReceipt {
  receipt: QuickBooksSalesReceipt;
  /** A new customer this receipt needs QuickBooks to create first. */
  customerToCreate?: QuickBooksCustomer;
  /** Surfaced in the sync log — never thrown, never blocking. */
  warnings: string[];
}

// ── Customer (matched by email, "[Last], [First]") ──────────────────────────

/** QuickBooks sorts by DisplayName, so "Johnson, Alice" keeps a client list
 *  alphabetical by surname the way a bookkeeper expects. */
export function toQuickBooksDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return `${last}, ${first}`;
}

export const WALK_IN_CUSTOMER = "Walk-in Customer";

interface ResolvedCustomer {
  ref: QuickBooksRef;
  create?: QuickBooksCustomer;
  warning?: string;
}

function resolveCustomer(
  txn: Transaction,
  data: QuickBooksCompanyData,
): ResolvedCustomer {
  const email = (txn.customerEmail ?? "").trim().toLowerCase();

  if (email) {
    const match = data.customers.find(
      (c) => c.PrimaryEmailAddr?.Address?.trim().toLowerCase() === email,
    );
    if (match) return { ref: { value: match.Id, name: match.DisplayName } };
  }

  // A sale with no client on file is a genuine walk-in, not an error.
  if (!txn.customerName?.trim()) {
    const walkIn = data.customers.find(
      (c) => c.DisplayName === WALK_IN_CUSTOMER,
    );
    return walkIn
      ? { ref: { value: walkIn.Id, name: walkIn.DisplayName } }
      : {
          ref: { value: "walk-in", name: WALK_IN_CUSTOMER },
          create: {
            Id: "walk-in",
            DisplayName: WALK_IN_CUSTOMER,
            Active: true,
            Balance: 0,
          },
        };
  }

  const displayName = toQuickBooksDisplayName(txn.customerName);
  const byName = data.customers.find((c) => c.DisplayName === displayName);
  if (byName) {
    return {
      ref: { value: byName.Id, name: byName.DisplayName },
      // Matching on name is a guess; email is the identity. Say so.
      warning: email
        ? undefined
        : `Matched "${displayName}" by name — this sale had no email address on it.`,
    };
  }

  const parts = txn.customerName.trim().split(/\s+/);
  return {
    ref: { value: `new:${displayName}`, name: displayName },
    create: {
      Id: `new:${displayName}`,
      DisplayName: displayName,
      GivenName: parts.slice(0, -1).join(" ") || undefined,
      FamilyName: parts.length > 1 ? parts[parts.length - 1] : undefined,
      PrimaryEmailAddr: email ? { Address: txn.customerEmail! } : undefined,
      Active: true,
      Balance: 0,
    },
  };
}

// ── Payment method ──────────────────────────────────────────────────────────

/** QuickBooks' own payment-method vocabulary is short; anything Yipyy supports
 *  that isn't cash or a card is recorded as "Other" rather than invented. */
export function toQuickBooksPaymentMethod(method: string): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "credit":
    case "debit":
      return "Credit Card";
    default:
      // gift card, store credit, package pass, charge-to-account, split …
      return "Other";
  }
}

// ── Line construction ───────────────────────────────────────────────────────

/** The mappings-store key for a cart item. Matches the prefixes the mapping
 *  screen writes, so a mapping made there resolves here. */
export function mappingKeyForCartItem(item: CartItem): string | undefined {
  if (item.productId) return `product:${item.productId}`;
  if (item.serviceId) return `service:${item.serviceId}`;
  if (item.packageId) return `package:${item.packageId}`;
  if (item.membershipId) return `membership:${item.membershipId}`;
  return undefined;
}

function lineDescription(item: CartItem, petName?: string): string {
  const base = item.variantName
    ? `${item.productName} (${item.variantName})`
    : item.productName;
  return item.itemType === "service" && petName ? `${base} — ${petName}` : base;
}

interface LineBuild {
  lines: QuickBooksSalesLine[];
  warnings: string[];
}

function buildItemLines(
  txn: Transaction,
  ctx: SalesReceiptContext,
  taxCodeRef: QuickBooksRef | undefined,
): LineBuild {
  const lines: QuickBooksSalesLine[] = [];
  const warnings: string[] = [];

  // Services first — Table 4 puts the service on line 1 and its add-ons after,
  // so the receipt reads the way the booking did.
  const ordered = [...txn.items].sort((a, b) => {
    const rank = (i: CartItem) => (i.itemType === "service" ? 0 : 1);
    return rank(a) - rank(b);
  });

  for (const item of ordered) {
    const key = mappingKeyForCartItem(item);
    const mapping = key ? ctx.mappings[key] : undefined;

    if (!key || !isMapped(mapping)) {
      warnings.push(
        `"${item.productName}" isn't mapped to a QuickBooks account — posted to Yipyy Unassigned Income.`,
      );
    }

    const itemRef: QuickBooksRef = mapping?.itemId
      ? {
          value: mapping.itemId,
          name: ctx.data.items.find((i) => i.Id === mapping.itemId)?.Name,
        }
      : { value: "unassigned", name: item.productName };

    const accountId = mapping?.accountId ?? ctx.catchAllAccountId;
    // Gross, not net: per-line discounts are pulled out into their own line so
    // the facility can still see what they gave away.
    const amountCents = toCents(item.unitPrice) * item.quantity;

    lines.push({
      LineNum: lines.length + 1,
      Description: lineDescription(item, txn.petName),
      Amount: toDollars(amountCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: itemRef,
        ItemAccountRef: {
          value: accountId,
          name: ctx.data.accounts.find((a) => a.Id === accountId)?.Name,
        },
        UnitPrice: item.unitPrice,
        Qty: item.quantity,
        TaxCodeRef: taxCodeRef,
      },
    });
  }

  return { lines, warnings };
}

function findAccountByName(
  data: QuickBooksCompanyData,
  pattern: RegExp,
): QuickBooksRef | undefined {
  const account = data.accounts.find((a) => a.Active && pattern.test(a.Name));
  return account ? { value: account.Id, name: account.Name } : undefined;
}

// ── The builder ─────────────────────────────────────────────────────────────

/**
 * Turn a completed Yipyy checkout into a QuickBooks Sales Receipt.
 *
 * Never throws: a transaction Yipyy could take is a transaction that must reach
 * the books, so problems come back as `warnings` for the sync log rather than
 * as an exception that would strand a payment.
 */
export function buildServiceSalesReceipt(
  txn: Transaction,
  ctx: SalesReceiptContext,
): BuiltSalesReceipt {
  const warnings: string[] = [];

  const customer = resolveCustomer(txn, ctx.data);
  if (customer.warning) warnings.push(customer.warning);

  const taxCode = ctx.data.taxCodes.find((t) => t.Taxable);
  const taxCodeRef = taxCode
    ? { value: taxCode.Id, name: taxCode.Name }
    : undefined;

  const { lines, warnings: lineWarnings } = buildItemLines(
    txn,
    ctx,
    taxCodeRef,
  );
  warnings.push(...lineWarnings);

  // ── Discount: one negative line, posted to contra-revenue ────────────────
  // Per-item discounts and the cart discount are combined: the client sees one
  // "you saved" number, and splitting it across lines would hide gross revenue,
  // which is the whole reason a discounts account exists.
  const perItemDiscountCents = txn.items.reduce(
    (sum, i) =>
      sum + Math.max(0, toCents(i.unitPrice) * i.quantity - toCents(i.total)),
    0,
  );
  const cartDiscountCents = toCents(txn.discountTotal ?? 0);
  const discountCents = Math.max(perItemDiscountCents, cartDiscountCents);

  if (discountCents > 0) {
    const discountRef =
      (ctx.settings.discountAccountId
        ? {
            value: ctx.settings.discountAccountId,
            name: ctx.data.accounts.find(
              (a) => a.Id === ctx.settings.discountAccountId,
            )?.Name,
          }
        : undefined) ?? findAccountByName(ctx.data, /discount/i);

    if (!discountRef)
      warnings.push(
        "No discount account is set — the discount line has no account.",
      );

    lines.push({
      LineNum: lines.length + 1,
      Description: txn.promoCodeUsed
        ? `Discount (${txn.promoCodeUsed})`
        : "Discount",
      Amount: -toDollars(discountCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: { value: "discount", name: "Discount" },
        ItemAccountRef: discountRef,
        // A discount reduces a taxable sale; it is not itself taxed.
        Qty: 1,
      },
    });
  }

  // ── Tip: a liability, never income ───────────────────────────────────────
  const tipCents = toCents(txn.tipAmount ?? 0);
  if (tipCents > 0) {
    const tipsRef = findAccountByName(ctx.data, /tip|gratuit/i);
    if (!tipsRef)
      warnings.push(
        "No Tips Payable account — the tip line has no account and would land in income.",
      );
    lines.push({
      LineNum: lines.length + 1,
      Description: "Tip",
      Amount: toDollars(tipCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: { value: "tips", name: "Tips" },
        ItemAccountRef: tipsRef,
        Qty: 1,
      },
    });
  }

  const taxCents = toCents(txn.taxTotal ?? 0);
  const yipyyTotalCents = toCents(txn.total);

  // ── RULE 5A: force the totals to agree ───────────────────────────────────
  const linesCents = lines.reduce((sum, l) => sum + toCents(l.Amount), 0);
  const deltaCents = yipyyTotalCents - (linesCents + taxCents);

  if (deltaCents !== 0) {
    lines.push({
      LineNum: lines.length + 1,
      Description: "Rounding adjustment",
      Amount: toDollars(deltaCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: { value: "rounding", name: "Rounding" },
        ItemAccountRef: findAccountByName(ctx.data, /discount/i),
        Qty: 1,
      },
    });

    // One cent is rounding. More than that is a real disagreement, and quietly
    // papering over it would hide a pricing or tax bug behind a balanced
    // receipt — so it balances AND it complains.
    if (Math.abs(deltaCents) > 1) {
      warnings.push(
        `Yipyy total and line total differed by ${toDollars(Math.abs(deltaCents)).toFixed(2)} — forced to match, but this is larger than rounding and worth checking.`,
      );
    }
  }

  const memoParts = [
    `Yipyy Booking #${txn.bookingId ?? txn.transactionNumber}`,
  ];
  if (ctx.staffName) memoParts.push(ctx.staffName);
  memoParts.push(ctx.bookingDate ?? txn.createdAt.slice(0, 10));

  const depositAccount = ctx.settings.depositAccountId
    ? ctx.data.accounts.find((a) => a.Id === ctx.settings.depositAccountId)
    : undefined;

  const receipt: QuickBooksSalesReceipt = {
    DocNumber: txn.transactionNumber,
    TxnDate: txn.createdAt.slice(0, 10),
    CustomerRef: customer.ref,
    DepositToAccountRef: depositAccount
      ? { value: depositAccount.Id, name: depositAccount.Name }
      : undefined,
    PaymentMethodRef: { value: toQuickBooksPaymentMethod(txn.paymentMethod) },
    CurrencyRef: { value: "CAD" },
    Line: lines,
    TxnTaxDetail:
      taxCents > 0
        ? { TxnTaxCodeRef: taxCodeRef, TotalTax: toDollars(taxCents) }
        : undefined,
    PrivateNote: memoParts.join(" | "),
    TotalAmt: toDollars(yipyyTotalCents),
  };

  return { receipt, customerToCreate: customer.create, warnings };
}

/** The invariant 5A demands, exposed so callers and checks can assert it. */
export function receiptBalances(receipt: QuickBooksSalesReceipt): boolean {
  const lines = receipt.Line.reduce((sum, l) => sum + toCents(l.Amount), 0);
  const tax = toCents(receipt.TxnTaxDetail?.TotalTax ?? 0);
  return lines + tax === toCents(receipt.TotalAmt);
}

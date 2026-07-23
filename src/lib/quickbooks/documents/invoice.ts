import type { CartItem, Transaction } from "@/types/retail";
import type {
  QuickBooksCompanyData,
  QuickBooksCustomer,
  QuickBooksInvoice,
  QuickBooksPayment,
  QuickBooksRef,
  QuickBooksSalesLine,
} from "@/types/quickbooks";

import { isMapped, type MappingSet } from "../mappings-store";
import type { QuickBooksSettings } from "../settings-store";
import { DEFAULT_INVOICE_DUE_DAYS } from "../settings-store";
import { mappingKeyForCartItem } from "./sales-receipt";
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
// Table 10 — an outstanding balance becomes a QuickBooks Invoice (Phase 6/5G).
//
// The difference between this and a Sales Receipt is the whole point: a Sales
// Receipt says "we were paid", an Invoice says "we are owed". Sending the wrong
// one is not cosmetic — a facility's Accounts Receivable is either right or it
// is fiction, and an unpaid booking posted as a receipt inflates both revenue
// and the bank balance on the same day.
//
// Three events, three documents:
//   created  → Invoice, Balance = TotalAmt
//   part-paid→ Payment applied, Invoice Balance falls, still open
//   settled  → Payment applied, Balance 0, QuickBooks marks it Paid
//
// TODO: real QuickBooks API (POST …/invoice, POST …/payment).
// ============================================================================

export interface InvoiceContext {
  data: QuickBooksCompanyData;
  mappings: MappingSet;
  settings: QuickBooksSettings;
  catchAllAccountId: string;
  /** Overrides the settings default for this one invoice. */
  dueDays?: number;
  /** Explicit due date, when the Yipyy record already carries one. */
  dueDate?: string;
  staffName?: string;
}

export interface BuiltInvoice {
  invoice: QuickBooksInvoice;
  customerToCreate?: QuickBooksCustomer;
  warnings: string[];
}

/** Terms, as a date. Kept pure so "net 15" is checkable rather than a guess
 *  made inside a component at render time. */
export function invoiceDueDate(
  issuedDate: string,
  dueDays: number = DEFAULT_INVOICE_DUE_DAYS,
): string {
  const issued = new Date(`${issuedDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(issued.getTime())) return issuedDate.slice(0, 10);
  issued.setUTCDate(issued.getUTCDate() + dueDays);
  return issued.toISOString().slice(0, 10);
}

function buildInvoiceLines(
  txn: Transaction,
  ctx: InvoiceContext,
  taxCodeRef: QuickBooksRef | undefined,
): { lines: QuickBooksSalesLine[]; warnings: string[] } {
  const lines: QuickBooksSalesLine[] = [];
  const warnings: string[] = [];

  const ordered = [...txn.items].sort((a, b) => {
    const rank = (i: CartItem) => (i.itemType === "service" ? 0 : 1);
    return rank(a) - rank(b);
  });

  for (const item of ordered) {
    const key = mappingKeyForCartItem(item);
    const mapping = key ? ctx.mappings[key] : undefined;

    if (!key || !isMapped(mapping)) {
      warnings.push(
        `"${item.productName}" isn't mapped to a QuickBooks account — invoiced against Yipyy Unassigned Income.`,
      );
    }

    const accountId = mapping?.accountId ?? ctx.catchAllAccountId;
    const base = item.variantName
      ? `${item.productName} (${item.variantName})`
      : item.productName;

    lines.push({
      LineNum: lines.length + 1,
      Description:
        item.itemType === "service" && txn.petName
          ? `${base} — ${txn.petName}`
          : base,
      Amount: toDollars(toCents(item.unitPrice) * item.quantity),
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
 * Build the Invoice for a booking that hasn't been paid.
 *
 * `amountPaid` handles the case where something was collected up front (a
 * deposit): the invoice still shows the full amount owed, and the deposit is a
 * Payment applied against it, because an invoice quietly reduced by its deposit
 * makes the deposit itself disappear from the books.
 */
export function buildBookingInvoice(
  txn: Transaction,
  ctx: InvoiceContext,
  amountPaid = 0,
): BuiltInvoice {
  const warnings: string[] = [];

  const customer = resolveCustomer(txn, ctx.data);
  if (customer.warning) warnings.push(customer.warning);
  if (customer.ref.name === "Walk-in Customer") {
    // You cannot chase a walk-in for money. Worth saying out loud before the
    // receivable ages into a write-off nobody can attribute.
    warnings.push(
      "This invoice has no client on file — it will sit against “Walk-in Customer”, which can't be collected from.",
    );
  }

  const taxCode = ctx.data.taxCodes.find((t) => t.Taxable);
  const taxCodeRef = taxCode
    ? { value: taxCode.Id, name: taxCode.Name }
    : undefined;

  const { lines, warnings: lineWarnings } = buildInvoiceLines(
    txn,
    ctx,
    taxCodeRef,
  );
  warnings.push(...lineWarnings);

  const discountCents = Math.max(
    txn.items.reduce(
      (sum, i) =>
        sum + Math.max(0, toCents(i.unitPrice) * i.quantity - toCents(i.total)),
      0,
    ),
    toCents(txn.discountTotal ?? 0),
  );

  if (discountCents > 0) {
    lines.push({
      LineNum: lines.length + 1,
      Description: txn.promoCodeUsed
        ? `Discount (${txn.promoCodeUsed})`
        : "Discount",
      Amount: -toDollars(discountCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: { value: "discount", name: "Discount" },
        ItemAccountRef: accountRef(ctx.data, ctx.settings.discountAccountId),
        Qty: 1,
      },
    });
  }

  const taxCents = toCents(txn.taxTotal ?? 0);
  const totalCents = toCents(txn.total);

  appendRoundingLine(
    lines,
    totalCents - (lineTotalCents(lines) + taxCents),
    ctx.data,
    warnings,
  );

  const issued = txn.createdAt.slice(0, 10);
  const paidCents = Math.max(0, Math.min(toCents(amountPaid), totalCents));

  const invoice: QuickBooksInvoice = {
    DocNumber: txn.transactionNumber,
    TxnDate: issued,
    DueDate:
      ctx.dueDate?.slice(0, 10) ??
      invoiceDueDate(
        issued,
        ctx.dueDays ?? ctx.settings.invoiceDueDays ?? DEFAULT_INVOICE_DUE_DAYS,
      ),
    CustomerRef: customer.ref,
    CurrencyRef: { value: "CAD" },
    Line: lines,
    TxnTaxDetail:
      taxCents > 0
        ? { TxnTaxCodeRef: taxCodeRef, TotalTax: toDollars(taxCents) }
        : undefined,
    Balance: toDollars(totalCents - paidCents),
    CustomerMemo: txn.bookingId
      ? { value: `Booking #${txn.bookingId}` }
      : undefined,
    PrivateNote: [
      `Yipyy Booking #${txn.bookingId ?? txn.transactionNumber}`,
      ctx.staffName,
      issued,
    ]
      .filter(Boolean)
      .join(" | "),
    TotalAmt: toDollars(totalCents),
  };

  return { invoice, customerToCreate: customer.create, warnings };
}

// ── Payments against an invoice ─────────────────────────────────────────────

export interface InvoicePaymentInput {
  /** The QuickBooks Invoice Id this pays. */
  invoiceId: string;
  invoiceNumber?: string;
  amount: number;
  /** What was still owed BEFORE this payment. */
  balanceBefore: number;
  paymentDate: string;
  paymentMethod: string;
  customerName?: string;
  customerEmail?: string;
  note?: string;
}

export interface BuiltInvoicePayment {
  payment: QuickBooksPayment;
  /** What the invoice owes afterwards. Zero means QuickBooks marks it Paid. */
  balanceAfter: number;
  /** True when this payment closes the invoice. */
  settlesInvoice: boolean;
  customerToCreate?: QuickBooksCustomer;
  warnings: string[];
}

/**
 * Build the Payment that moves an invoice toward Paid.
 *
 * QuickBooks derives "Paid" from the balance rather than from a flag, so the
 * only thing this has to get right is the arithmetic. An overpayment is left
 * `UnappliedAmt` rather than silently applied: it is a real thing that happens,
 * and a customer credit is the honest place for it.
 */
export function buildInvoicePayment(
  input: InvoicePaymentInput,
  ctx: Pick<InvoiceContext, "data" | "settings">,
): BuiltInvoicePayment {
  const warnings: string[] = [];

  const customer = resolveCustomer(input, ctx.data);
  if (customer.warning) warnings.push(customer.warning);

  const amountCents = toCents(input.amount);
  const beforeCents = toCents(input.balanceBefore);
  const appliedCents = Math.min(amountCents, Math.max(0, beforeCents));
  const unappliedCents = amountCents - appliedCents;
  const afterCents = beforeCents - appliedCents;

  if (unappliedCents > 0) {
    warnings.push(
      `Payment of ${toDollars(amountCents).toFixed(2)} exceeds the ${toDollars(beforeCents).toFixed(2)} outstanding — ${toDollars(unappliedCents).toFixed(2)} is left unapplied as a customer credit.`,
    );
  }

  const payment: QuickBooksPayment = {
    TxnDate: input.paymentDate.slice(0, 10),
    CustomerRef: customer.ref,
    PaymentMethodRef: { value: toQuickBooksPaymentMethod(input.paymentMethod) },
    DepositToAccountRef: accountRef(ctx.data, ctx.settings.depositAccountId),
    CurrencyRef: { value: "CAD" },
    LinkedTxn: [{ TxnId: input.invoiceId, TxnType: "Invoice" }],
    PrivateNote:
      input.note ??
      `Payment against ${input.invoiceNumber ? `Invoice ${input.invoiceNumber}` : "invoice"}${
        afterCents === 0 ? " — settled in full" : " — partial"
      }`,
    TotalAmt: toDollars(amountCents),
    UnappliedAmt: unappliedCents > 0 ? toDollars(unappliedCents) : undefined,
  };

  return {
    payment,
    balanceAfter: toDollars(afterCents),
    settlesInvoice: afterCents === 0,
    customerToCreate: customer.create,
    warnings,
  };
}

/** RULE 5A for an invoice. */
export function invoiceBalances(invoice: QuickBooksInvoice): boolean {
  const lines = lineTotalCents(invoice.Line);
  const tax = toCents(invoice.TxnTaxDetail?.TotalTax ?? 0);
  return lines + tax === toCents(invoice.TotalAmt);
}

import type {
  QuickBooksCompanyData,
  QuickBooksCustomer,
  QuickBooksRef,
  QuickBooksSalesLine,
  QuickBooksSalesReceipt,
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
// Packages (Table 5 / 5B).
//
// The accounting question a prepaid package asks is WHEN the revenue is earned,
// and Yipyy's answer is: at the sale. The facility has the money, the passes
// are non-refundable by default, and deferring across an unknown redemption
// schedule would need a liability model no one here is maintaining.
//
// That single choice determines everything below:
//
//   sale       → a Sales Receipt for the FULL package price. No discount line,
//                even though the package is cheaper than buying à la carte:
//                the package IS the product, at its own price. A discount line
//                would invent contra-revenue against a sale that never happened
//                at the higher number.
//   redemption → a $0 Sales Receipt. The service is shown at full price so the
//                client's record says what they received, and an equal credit
//                line cancels it. Net revenue: zero — because it was already
//                recognised at the sale, and recognising it again would count
//                the same money twice.
//
// TODO: real QuickBooks API (POST /v3/company/{realmId}/salesreceipt).
// ============================================================================

export interface PackageContext {
  data: QuickBooksCompanyData;
  mappings: MappingSet;
  settings: QuickBooksSettings;
  catchAllAccountId: string;
}

export interface BuiltPackageDocument {
  receipt: QuickBooksSalesReceipt;
  customerToCreate?: QuickBooksCustomer;
  warnings: string[];
}

// ── (a) The sale ────────────────────────────────────────────────────────────

export interface PackageSaleInput {
  /** Yipyy's id for this purchase — the idempotency anchor. */
  customerPackageId: string;
  /** Catalog id, for the mapping lookup (`package:<id>`). */
  packageId: string;
  packageName: string;
  /** What the client actually paid. NOT the à-la-carte value. */
  packagePrice: number;
  passesTotal: number;
  purchasedAt: string;
  expiresAt?: string;
  taxAmount?: number;
  paymentMethod?: string;
  receiptNumber?: string;
  customerName?: string;
  customerEmail?: string;
}

/**
 * A prepaid package was sold.
 *
 * One line, at the package price. The à-la-carte comparison ("save 15%") is a
 * marketing number, not a transaction: it never hit a ledger, so it does not
 * get a discount line here.
 */
export function buildPackageSaleReceipt(
  sale: PackageSaleInput,
  ctx: PackageContext,
): BuiltPackageDocument {
  const warnings: string[] = [];

  const customer = resolveCustomer(sale, ctx.data);
  if (customer.warning) warnings.push(customer.warning);

  const mapping = ctx.mappings[`package:${sale.packageId}`];
  if (!isMapped(mapping)) {
    warnings.push(
      `"${sale.packageName}" isn't mapped to a QuickBooks account — posted to Yipyy Unassigned Income.`,
    );
  }

  const taxCode = ctx.data.taxCodes.find((t) => t.Taxable);
  const taxCodeRef = taxCode
    ? { value: taxCode.Id, name: taxCode.Name }
    : undefined;

  const priceCents = toCents(sale.packagePrice);
  const taxCents = toCents(sale.taxAmount ?? 0);

  const lines: QuickBooksSalesLine[] = [
    {
      LineNum: 1,
      Description: `${sale.packageName} (${sale.passesTotal} ${
        sale.passesTotal === 1 ? "pass" : "passes"
      })`,
      Amount: toDollars(priceCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: mapping?.itemId
          ? {
              value: mapping.itemId,
              name: ctx.data.items.find((i) => i.Id === mapping.itemId)?.Name,
            }
          : { value: "unassigned", name: sale.packageName },
        ItemAccountRef: accountRef(
          ctx.data,
          mapping?.accountId ?? ctx.catchAllAccountId,
        ),
        UnitPrice: sale.packagePrice,
        Qty: 1,
        TaxCodeRef: taxCodeRef,
      },
    },
  ];

  const totalCents = priceCents + taxCents;
  appendRoundingLine(
    lines,
    totalCents - (lineTotalCents(lines) + taxCents),
    ctx.data,
    warnings,
  );

  const receipt: QuickBooksSalesReceipt = {
    DocNumber: sale.receiptNumber,
    TxnDate: sale.purchasedAt.slice(0, 10),
    CustomerRef: customer.ref,
    DepositToAccountRef: accountRef(ctx.data, ctx.settings.depositAccountId),
    PaymentMethodRef: {
      value: toQuickBooksPaymentMethod(sale.paymentMethod ?? ""),
    },
    CurrencyRef: { value: "CAD" },
    Line: lines,
    TxnTaxDetail:
      taxCents > 0
        ? { TxnTaxCodeRef: taxCodeRef, TotalTax: toDollars(taxCents) }
        : undefined,
    PrivateNote: [
      `Yipyy package sale ${sale.customerPackageId}`,
      `${sale.passesTotal} passes`,
      sale.expiresAt ? `Expires ${sale.expiresAt.slice(0, 10)}` : undefined,
      "Revenue recognised at sale",
    ]
      .filter(Boolean)
      .join(" | "),
    TotalAmt: toDollars(totalCents),
  };

  return { receipt, customerToCreate: customer.create, warnings };
}

// ── (b) The redemption ──────────────────────────────────────────────────────

export const PACKAGE_PASS_LINE = "Package Pass Applied";

export interface PackageRedemptionInput {
  customerPackageId: string;
  packageName: string;
  /** Yipyy id of this specific redemption — the idempotency anchor. */
  redemptionId: string;
  /** The service being delivered, at its normal price. */
  serviceId?: string;
  serviceName: string;
  servicePrice: number;
  redeemedAt: string;
  passNumber: number;
  passesTotal: number;
  bookingId?: number;
  petName?: string;
  /** The Sales Receipt the package was sold on, for the memo trail. */
  packageReceiptNumber?: string;
  customerName?: string;
  customerEmail?: string;
}

/**
 * A pass was redeemed against a booking.
 *
 * The offset line MUST land in an income account. Posting it to a liability
 * would leave the service line adding revenue that was already recognised when
 * the package sold — the same money counted twice. A configured contra-revenue
 * account keeps redemptions visible as their own line in the P&L; anything else
 * falls back to the service's own account, where it simply cancels out.
 */
export function buildPackageRedemptionReceipt(
  redemption: PackageRedemptionInput,
  ctx: PackageContext,
): BuiltPackageDocument {
  const warnings: string[] = [];

  const customer = resolveCustomer(redemption, ctx.data);
  if (customer.warning) warnings.push(customer.warning);

  const mapping = redemption.serviceId
    ? ctx.mappings[`service:${redemption.serviceId}`]
    : undefined;
  if (!isMapped(mapping)) {
    warnings.push(
      `"${redemption.serviceName}" isn't mapped to a QuickBooks account — the redemption is recorded against Yipyy Unassigned Income.`,
    );
  }

  const serviceAccountId = mapping?.accountId ?? ctx.catchAllAccountId;
  const priceCents = toCents(redemption.servicePrice);

  const serviceRef: QuickBooksRef = mapping?.itemId
    ? {
        value: mapping.itemId,
        name: ctx.data.items.find((i) => i.Id === mapping.itemId)?.Name,
      }
    : { value: "unassigned", name: redemption.serviceName };

  // Where the offset goes. It has to be income, or the books gain revenue that
  // was already booked at the sale.
  const configured = ctx.settings.packageRedemptionAccountId
    ? ctx.data.accounts.find(
        (a) => a.Id === ctx.settings.packageRedemptionAccountId,
      )
    : undefined;
  let offsetAccountId = serviceAccountId;
  if (configured) {
    if (configured.Classification === "Revenue") {
      offsetAccountId = configured.Id;
    } else {
      warnings.push(
        `The package-redemption account "${configured.Name}" isn't an income account — the offset was posted back to the service's own income account instead, so revenue isn't counted twice.`,
      );
    }
  }

  const lines: QuickBooksSalesLine[] = [
    {
      LineNum: 1,
      Description: redemption.petName
        ? `${redemption.serviceName} — ${redemption.petName}`
        : redemption.serviceName,
      Amount: toDollars(priceCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: serviceRef,
        ItemAccountRef: accountRef(ctx.data, serviceAccountId),
        UnitPrice: redemption.servicePrice,
        Qty: 1,
        // No tax: nothing is being charged. The tax was settled when the
        // package was sold.
      },
    },
    {
      LineNum: 2,
      Description: `${PACKAGE_PASS_LINE} (${redemption.packageName}, pass ${redemption.passNumber} of ${redemption.passesTotal})`,
      Amount: -toDollars(priceCents),
      DetailType: "SalesItemLineDetail",
      SalesItemLineDetail: {
        ItemRef: { value: "package-pass", name: PACKAGE_PASS_LINE },
        ItemAccountRef: accountRef(ctx.data, offsetAccountId),
        Qty: 1,
      },
    },
  ];

  const receipt: QuickBooksSalesReceipt = {
    DocNumber: redemption.redemptionId,
    TxnDate: redemption.redeemedAt.slice(0, 10),
    CustomerRef: customer.ref,
    // Nothing is banked, so no deposit account: a $0 receipt pointing at the
    // bank invites someone to look for a matching deposit that never existed.
    PaymentMethodRef: { value: "Other" },
    CurrencyRef: { value: "CAD" },
    Line: lines,
    PrivateNote: [
      `Package pass redeemed — ${redemption.packageName}`,
      redemption.packageReceiptNumber
        ? `Package receipt ${redemption.packageReceiptNumber}`
        : `Package ${redemption.customerPackageId}`,
      redemption.bookingId
        ? `Booking #${redemption.bookingId}`
        : "No booking reference",
      `Pass ${redemption.passNumber} of ${redemption.passesTotal}`,
      "Revenue was recognised when the package was sold",
    ]
      .filter(Boolean)
      .join(" | "),
    TotalAmt: 0,
  };

  return { receipt, customerToCreate: customer.create, warnings };
}

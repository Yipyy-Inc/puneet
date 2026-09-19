import type { ReceiptInput, ReceiptLine } from "@/lib/clover/receipt";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";

// ============================================================================
// A SETTLED BOOKING'S RECEIPT, FROM ITS LEDGER.
//
// The booking page could print an invoice but not email a receipt: the email
// and text buttons in the checkout were toasts, and were removed rather than
// kept as promises. This builds the receipt the facility sends afterwards, for
// the whole booking, from what the PAYMENTS recorded — the subtotal, tax and
// tip each payment was taken with, refunds netted out — so the email agrees
// with the money the facility collected, not with a figure worked out again.
//
// A receipt says "paid". It is built only for a booking that is settled; one
// with something still owed gets the pay link, not a receipt.
//
// Pure — no clock, no database — so it is unit-tested; the route reads the
// rows and supplies `printedAt` in the facility's own zone.
// ============================================================================

export interface ReceiptBookingRow {
  ref: number;
  serviceLabel: string;
  basePrice: number;
  discount: number;
  clientName: string | null;
  petNames: string[];
}

export interface ReceiptLineItemRow {
  name: string;
  price: number | null;
  unitPrice: number;
  quantity: number;
}

export interface ReceiptPaymentRow {
  method: string;
  subtotal: number;
  tax: number;
  tip: number;
  grandTotal: number;
  cardBrand: string | null;
  cardLast4: string | null;
  entryMethod: string | null;
  authCode: string | null;
  processorPaymentId: string | null;
}

export interface ReceiptFacilityRow {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logoUrl: string | null;
}

const cents = (value: number | null | undefined) =>
  Math.round(Number(value ?? 0) * 100);

/** How a payment was taken, as a receipt says it. */
const METHOD: Record<string, string> = {
  cash: "Cash",
  "new-card": "Card",
  "card-on-file": "Card on file",
  terminal: "Card (terminal)",
  "e-transfer": "E-transfer",
  "gift-card": "Gift card",
  ach: "Bank transfer",
};

export type ReceiptRefusal = "nothing_paid";

/**
 * The receipt for a booking, or why there is none.
 *
 * The lines are the booking's service and its added items, less its discount;
 * where they do not add up to what was paid (a price changed after payment, a
 * partial refund), the difference is shown as its own line rather than the
 * lines silently disagreeing with the subtotal under them. The tax is the
 * ledger's; it is split by tax name only when the facility's rates reproduce
 * it to the cent, and otherwise printed as one line.
 */
export function bookingReceiptInput(input: {
  booking: ReceiptBookingRow;
  items: ReceiptLineItemRow[];
  payments: ReceiptPaymentRow[];
  facility: ReceiptFacilityRow;
  taxConfig: TaxConfig;
  printedAt: string;
}): ReceiptInput | ReceiptRefusal {
  const { booking, payments, taxConfig } = input;
  const subtotalCents = payments.reduce((sum, p) => sum + cents(p.subtotal), 0);
  const taxCents = payments.reduce((sum, p) => sum + cents(p.tax), 0);
  const tipCents = payments.reduce((sum, p) => sum + cents(p.tip), 0);
  const totalCents = payments.reduce((sum, p) => sum + cents(p.grandTotal), 0);
  if (totalCents <= 0) return "nothing_paid";

  const lines: ReceiptLine[] = [
    { label: booking.serviceLabel, amountCents: cents(booking.basePrice) },
    ...input.items.map((item) => ({
      label: item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name,
      amountCents:
        item.price === null
          ? cents(item.unitPrice * item.quantity)
          : cents(item.price),
    })),
  ];
  const discountCents = cents(booking.discount);
  const linesNet =
    lines.reduce((sum, line) => sum + line.amountCents, 0) - discountCents;
  // Tax-inclusive prices carry the tax inside the lines, so the lines are
  // compared with what was paid before the tip; otherwise with the subtotal.
  const linesShouldBe = taxConfig.pricesIncludeTax
    ? subtotalCents + taxCents
    : subtotalCents;
  if (linesNet !== linesShouldBe) {
    lines.push({
      label: linesNet > linesShouldBe ? "Adjustment" : "Other charges",
      amountCents: linesShouldBe - linesNet,
    });
  }

  const byName = computeTax(
    taxConfig.pricesIncludeTax ? subtotalCents + taxCents : subtotalCents,
    taxConfig,
  );
  const taxLines =
    taxCents === 0
      ? []
      : byName.totalCents === taxCents
        ? byName.lines.map((t) => ({
            name: t.name,
            rate: t.rate,
            amountCents: t.amountCents,
          }))
        : [
            {
              name: "Tax",
              // A fraction, as every tax rate here is (0.14975, not 14.975).
              rate:
                subtotalCents > 0
                  ? Math.round((taxCents / subtotalCents) * 100000) / 100000
                  : 0,
              amountCents: taxCents,
            },
          ];

  const registrations = taxConfig.showRegistrationOnInvoice
    ? taxConfig.taxes
        .filter((t) => t.enabled && t.registrationNumber.trim())
        .map((t) => `${t.name}: ${t.registrationNumber}`)
        .join(" · ")
    : "";

  // One payment prints its own card details; several print how many.
  const charges = payments.filter((p) => cents(p.grandTotal) > 0);
  const only = charges.length === 1 ? charges[0] : null;

  return {
    facility: {
      name: input.facility.name,
      address: input.facility.address,
      phone: input.facility.phone,
      email: input.facility.email,
      website: input.facility.website,
      taxRegistrations: registrations || null,
      logoUrl: input.facility.logoUrl,
    },
    bookingRef: booking.ref,
    reference: `Booking #${booking.ref}`,
    clientName: booking.clientName,
    petNames: booking.petNames,
    lines,
    discountCents,
    // The ledger's subtotal is the supply before tax either way; for a
    // tax-inclusive facility the lines above already carry the tax.
    subtotalCents,
    taxLines,
    taxTotalCents: taxCents,
    tipCents,
    totalCents,
    paymentMethod: only
      ? (METHOD[only.method] ?? "Paid")
      : `Paid in ${charges.length} payments`,
    cardBrand: only?.cardBrand ?? null,
    cardLast4: only?.cardLast4 ?? null,
    entryMethod: only?.entryMethod ?? null,
    authCode: only?.authCode ?? null,
    processorPaymentId: only?.processorPaymentId ?? null,
    printedAt: input.printedAt,
  };
}

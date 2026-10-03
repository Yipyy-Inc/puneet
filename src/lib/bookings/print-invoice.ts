import type { BookingLineItem } from "@/app/api/bookings/[ref]/line-items/route";
import { buildInvoiceDocumentHtml } from "@/lib/invoice-document";
import type { InvoiceTemplate } from "@/types/invoice-template";
import { formatCalendarDayLong, formatDateLong } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { computeTax, type TaxConfig } from "@/lib/settings/tax";
import { taxableOwedForBooking } from "@/lib/payments/service-tax";
import type { Booking } from "@/types/booking";

// ============================================================================
// The printed invoice or receipt for one booking.
//
// Moved out of the booking page, where it was 130 lines inside an onClick.
// ── THE SAME LINES THE REST OF THE APP CHARGES ──────────────────────────
//
// It used to read `booking.invoice` — the fixture blob that exists on 26 of
// 259 bookings — and fall back to ONE line for every booking without one. So
// the formal document a customer keeps showed a single "daycare $45.00" while
// the counter, the terminal and the emailed receipt all said $80.00 plus tax.
// It prints the base line, the booking's line items and fees, and tax from
// the facility's own setting — the same call the terminal makes — with dates
// in the viewer's language (they were fixed to en-US).
// ============================================================================

/** "full_day" is a stored key, not a word; it reached the paper raw. */
function humaniseLabel(raw: string): string {
  const words = raw.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : raw;
}

export interface PrintInvoiceInput {
  booking: Booking;
  bookingRef: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  petName?: string;
  lineItems: BookingLineItem[];
  taxConfig: TaxConfig;
  template: InvoiceTemplate;
  /** What the ledger has collected as tips (not in `amountPaid`). */
  tipCollected: number;
  locale: AppLocale;
}

export function printBookingInvoice(input: PrintInvoiceInput): void {
  const { booking, lineItems, taxConfig, locale } = input;
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;

  const day = (value: string) => formatCalendarDayLong(value, locale);
  const dateRange =
    booking.startDate &&
    booking.endDate &&
    booking.startDate !== booking.endDate
      ? `${day(booking.startDate)} – ${day(booking.endDate)}`
      : booking.startDate
        ? day(booking.startDate)
        : undefined;

  const items = [
    {
      name: humaniseLabel(booking.serviceType || booking.service),
      unitPrice: booking.basePrice,
      quantity: 1,
      price: booking.basePrice,
    },
    ...lineItems
      .filter((item) => item.kind !== "fee")
      .map((item) => ({
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        price: item.price,
      })),
  ];
  const fees = lineItems
    .filter((item) => item.kind === "fee")
    .map((item) => ({
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      price: item.price,
    }));

  const subtotal = booking.amountDue ?? booking.totalCost;
  // Only the taxable part. A facility can mark a service tax-free
  // (2026-09-21) and extras stay taxed — service-tax.ts splits in proportion,
  // the same way the screen this paper is printed from does.
  const tax = computeTax(
    taxableOwedForBooking(booking, Math.round(subtotal * 100)),
    taxConfig,
  );
  const tipTotal = booking.tipAmount ?? 0;
  const total = taxConfig.pricesIncludeTax
    ? subtotal + tipTotal
    : subtotal + tax.totalCents / 100 + tipTotal;
  const paid = booking.amountPaid ?? 0;

  const html = buildInvoiceDocumentHtml(input.template, {
    // The BOOKING's ref, so a printed document can be traced back from a
    // counter.
    invoiceNumber: input.bookingRef,
    issuedDate: formatDateLong(new Date(), locale),
    bookingDateRange: dateRange,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    clientPhone: input.clientPhone,
    petName: input.petName,
    serviceLabel: booking.service,
    items,
    fees: fees.length > 0 ? fees : undefined,
    subtotal,
    discount: booking.discount || undefined,
    discountLabel: booking.discountReason,
    taxes: tax.lines.map((line) => ({
      name: line.name,
      rate: line.rate,
      amount: line.amountCents / 100,
    })),
    taxAmount: tax.totalCents / 100,
    tipTotal: tipTotal || undefined,
    total,
    // The total counts the booking's tip, and `amountPaid` never includes a
    // tip, so a tip the ledger collected is taken off here too or the
    // document asks for it again.
    remainingDue: Math.max(0, total - paid - input.tipCollected),
    variant: paid + input.tipCollected >= total ? "receipt" : "invoice",
  });
  w.document.write(html);
  w.document.close();
  w.print();
}

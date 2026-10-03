"use client";

import { useInvoiceTemplate } from "@/hooks/use-invoice-template";
import { printBookingInvoice } from "@/lib/bookings/print-invoice";

import type { BookingDetails } from "./use-booking-details";

// ============================================================================
// More › Print booking: the facility's own invoice — its identity, its tax,
// the booking's real lines — printed, as the page always printed it.
// ============================================================================

export function usePrintBooking(d: BookingDetails) {
  // The facility's identity and tax, not the template fixture's.
  const invoiceTemplate = useInvoiceTemplate();
  return () => {
    if (!d.booking || !d.client) return;
    printBookingInvoice({
      booking: d.booking,
      bookingRef: d.bookingRef,
      clientName: d.client.name,
      clientEmail: d.client.email,
      clientPhone: d.client.phone,
      petName: d.pet?.name,
      lineItems: d.lineItems,
      taxConfig: d.taxConfig,
      template: invoiceTemplate,
      tipCollected: d.tips?.tipCollected ?? 0,
      locale: d.text.locale,
    });
  };
}

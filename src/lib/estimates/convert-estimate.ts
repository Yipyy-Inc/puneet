import type { Estimate, NewBooking } from "@/types/booking";

// ============================================================================
// An estimate, as the booking it becomes.
//
// This file used to FINISH the conversion too: push a booking onto the
// `@/data/bookings` fixture, flip the estimate in memory, and "send" a
// confirmation email to an in-memory outbox. The booking is created through
// /api/bookings now and the estimate is pointed at it by
// `useConvertEstimate` (src/lib/api/estimates.ts). What is left here is the
// mapping, which is the one part that was always real.
//
// No deposit rides along. The fixture version attached `initialDeposit` —
// "card, collected on acceptance" — when the facility's settings said a
// deposit was due on accepting, whether or not anybody had taken one.
// Accepting an estimate moves no money; a deposit is taken at the till.
// ============================================================================

/** `facilityId` on NewBooking is a label the server ignores (it uses the session). */
const FACILITY_LABEL = 11;

/**
 * Booking notes carried over from the estimate: staff-only notes plus the
 * customer-facing note, tagged with its source estimate number.
 */
export function estimateBookingNotes(estimate: Estimate): string {
  const parts: string[] = [];
  const internal =
    estimate.internalNotes || estimate.internalNote || estimate.notes;
  if (internal) parts.push(internal.trim());
  if (estimate.publicNote && estimate.publicNote !== internal) {
    parts.push(`[${estimate.estimateId}] ${estimate.publicNote}`);
  }
  return parts.join("\n");
}

/** Map an estimate onto the booking-create shape (NewBooking) — no re-entry. */
export function buildBookingDataFromEstimate(estimate: Estimate): NewBooking {
  const petId =
    estimate.petIds.length === 1 ? estimate.petIds[0] : estimate.petIds;
  const notes = estimateBookingNotes(estimate);

  return {
    clientId: estimate.clientId,
    petId,
    facilityId: FACILITY_LABEL,
    service: estimate.service,
    serviceType: estimate.serviceType || estimate.roomType,
    startDate: estimate.startDate,
    endDate: estimate.endDate || estimate.startDate,
    checkInTime: estimate.checkInTime,
    checkOutTime: estimate.checkOutTime,
    status: "confirmed",
    basePrice: estimate.subtotal,
    discount: estimate.discount,
    discountReason: estimate.discountReason,
    totalCost: estimate.total,
    kennel: estimate.roomType,
    specialRequests: notes || undefined,
  };
}

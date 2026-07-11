import { bookings } from "@/data/bookings";
import { sendBookingConfirmationEmail } from "@/lib/estimates/email-sends";
import type { Booking, Estimate, NewBooking } from "@/types/booking";

// The demo facility estimates belong to (matches the estimate wizard).
const DEMO_FACILITY_ID = 11;

function nextBookingId(): number {
  return bookings.reduce((m, b) => Math.max(m, b.id), 1000) + 1;
}

/**
 * Booking notes carried over from the estimate (spec 7.x): staff-only notes
 * plus the customer-facing note, tagged with its source estimate id.
 */
export function estimateBookingNotes(estimate: Estimate): string {
  const parts: string[] = [];
  const internal =
    estimate.internalNotes || estimate.internalNote || estimate.notes;
  if (internal) parts.push(internal.trim());
  if (estimate.publicNote) {
    parts.push(`[From Estimate ${estimate.estimateId}] ${estimate.publicNote}`);
  }
  return parts.join("\n");
}

/** Map an estimate onto the booking-create shape (NewBooking) — no re-entry. */
export function buildBookingDataFromEstimate(
  estimate: Estimate,
  opts?: { depositPaid?: boolean },
): NewBooking {
  const petId =
    estimate.petIds.length === 1 ? estimate.petIds[0] : estimate.petIds;
  const deposit = estimate.depositRequired ?? 0;
  const depositPaid = !!opts?.depositPaid && deposit > 0;
  const notes = estimateBookingNotes(estimate);

  return {
    clientId: estimate.clientId,
    petId,
    facilityId: DEMO_FACILITY_ID,
    service: estimate.service,
    serviceType: estimate.serviceType || estimate.roomType,
    startDate: estimate.startDate,
    endDate: estimate.endDate,
    checkInTime: estimate.checkInTime,
    checkOutTime: estimate.checkOutTime,
    status: "confirmed",
    basePrice: estimate.subtotal,
    discount: estimate.discount,
    discountReason: estimate.discountReason,
    totalCost: estimate.total,
    // A paid deposit is a partial payment — the balance is still due.
    paymentStatus: "pending",
    kennel: estimate.roomType,
    specialRequests: notes || undefined,
    initialDeposit: depositPaid
      ? {
          amount: deposit,
          method: "card",
          ruleLabel: "Estimate deposit",
          collectedAt: estimate.acceptedAt,
        }
      : undefined,
  };
}

/**
 * Finalize a conversion: append the booking to the shared bookings list (so it
 * shows in both the facility and customer portals), flip the estimate to
 * converted, and send the booking-confirmation email (Area 6.2). Returns the id.
 */
export function finalizeEstimateConversion(
  estimate: Estimate,
  data: NewBooking,
  now: Date = new Date(),
): number {
  const bookingId = nextBookingId();
  const booking: Booking = { ...data, id: bookingId };
  bookings.push(booking);

  estimate.status = "converted";
  estimate.convertedBookingId = bookingId;
  estimate.activityLog = [
    ...(estimate.activityLog ?? []),
    {
      at: now.toISOString(),
      type: "Converted",
      actor: "Staff",
      detail: `Booking #${bookingId}`,
    },
  ];

  sendBookingConfirmationEmail(estimate, bookingId);
  return bookingId;
}

/** Convert an estimate to a booking as-is (the "Confirm Booking" path). */
export function convertEstimateToBooking(
  estimate: Estimate,
  opts?: { now?: Date; depositPaid?: boolean },
): number {
  return finalizeEstimateConversion(
    estimate,
    buildBookingDataFromEstimate(estimate, { depositPaid: opts?.depositPaid }),
    opts?.now,
  );
}

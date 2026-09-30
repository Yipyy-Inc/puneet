import type { Estimate, ExtraService, NewBooking } from "@/types/booking";

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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The estimate's add-on lines as a booking's add-ons, and the money they
 * come to. A line is one when it names its add-on (`addOnRef`), in a whole
 * quantity, and there is a pet to put it on: the one it names, or — when it
 * names none, or one the estimate no longer has — the estimate's first.
 * Anything else — an estimate written before lines named their add-ons, one
 * line of "Add-ons" — stays in the booking's price, as it always did.
 */
export function estimateAddOns(estimate: Estimate): {
  extraServices: ExtraService[];
  money: number;
} {
  const extraServices: ExtraService[] = [];
  let money = 0;
  for (const line of estimate.lineItems) {
    const petId =
      line.petRef !== undefined && estimate.petIds.includes(line.petRef)
        ? line.petRef
        : estimate.petIds[0];
    if (
      !line.addOnRef ||
      petId === undefined ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1
    ) {
      continue;
    }
    extraServices.push({
      serviceId: line.addOnRef,
      quantity: line.quantity,
      petId,
    });
    money += line.amount * line.quantity;
  }
  return { extraServices, money: round2(money) };
}

/** Map an estimate onto the booking-create shape (NewBooking) — no re-entry. */
export function buildBookingDataFromEstimate(estimate: Estimate): NewBooking {
  const petId =
    estimate.petIds.length === 1 ? estimate.petIds[0] : estimate.petIds;
  const notes = estimateBookingNotes(estimate);
  // ── THE ADD-ONS ARE LINES OF THEIR OWN ──────────────────────────────────
  //
  // Sent as the booking's add-ons, so the server writes each as an add-on
  // line, at the facility's price for it today — one taxed by its own rule,
  // assignable to somebody, named on the receipt. Their money comes out of
  // `total_cost`, which is the service alone (2026-09-30).
  const addOns = estimateAddOns(estimate);
  const service = round2(estimate.subtotal - addOns.money);

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
    basePrice: service,
    discount: estimate.discount,
    discountReason: estimate.discountReason,
    // ── GROSS, AND WITHOUT TAX ──────────────────────────────────────────
    //
    // `estimate.total` is the wrong number twice over: it is already net of
    // the discount (`mappers/estimate.ts:295`), which `amount_due` then
    // subtracts AGAIN, and it carries tax, which a booking's price never
    // does — tax is charged at payment from the facility's own settings.
    //
    // `subtotal` is the gross line sum, which is exactly what `total_cost`
    // means: `amount_due = total_cost + extras_total - discount` — less the
    // add-ons, which the server bills as lines.
    totalCost: service,
    ...(addOns.extraServices.length > 0
      ? { extraServices: addOns.extraServices }
      : {}),
    // The estimate listed every charge, and those are what the customer
    // accepted. The facility's automatic service charges went on top of them
    // — its fees, twice — until 2026-09-30.
    serviceChargesIncluded: true,
    kennel: estimate.roomType,
    specialRequests: notes || undefined,
  };
}

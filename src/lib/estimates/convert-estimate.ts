import type {
  Estimate,
  ExtraService,
  NewBooking,
  StatedServiceCharge,
} from "@/types/booking";

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

interface AddOnLine {
  ref: string;
  petId: number;
  quantity: number;
  amount: number;
  /** Of `quantity`, the units the service attaches by itself. */
  included: number;
}

/**
 * The estimate's add-on lines. A line is one when it names its add-on
 * (`addOnRef`), in a whole quantity, and there is a pet to put it on: the one
 * it names, or — when it names none, or one the estimate no longer has — the
 * estimate's first. Anything else — an estimate written before lines named
 * their add-ons, one line of "Add-ons" — stays in the booking's price, as it
 * always did.
 */
function addOnLinesOf(estimate: Estimate): AddOnLine[] {
  return estimate.lineItems.flatMap((line) => {
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
      return [];
    }
    return [
      {
        ref: line.addOnRef,
        petId,
        quantity: line.quantity,
        amount: line.amount,
        included: Math.min(
          line.quantity,
          Math.max(0, line.includedQuantity ?? 0),
        ),
      },
    ];
  });
}

/** The estimate's add-on lines as a booking's add-ons, and their money. */
export function estimateAddOns(estimate: Estimate): {
  extraServices: ExtraService[];
  money: number;
} {
  const lines = addOnLinesOf(estimate);
  return {
    extraServices: lines.map((line) => ({
      serviceId: line.ref,
      quantity: line.quantity,
      petId: line.petId,
    })),
    money: round2(
      lines.reduce((sum, line) => sum + line.amount * line.quantity, 0),
    ),
  };
}

/**
 * The estimate's fee lines as they go onto the booking's bill, and their
 * money. A line is one when it names the rule that charged it (`feeId`), in a
 * whole quantity. A second line for the same rule stays in the booking's
 * price, because a bill carries each fee once — and so does anything written
 * before fees had lines of their own: the one "Fees and adjustments" line.
 */
export function estimateFees(estimate: Estimate): {
  serviceCharges: StatedServiceCharge[];
  money: number;
} {
  const serviceCharges: StatedServiceCharge[] = [];
  const named = new Set<string>();
  let money = 0;
  for (const line of estimate.lineItems) {
    if (
      !line.feeId ||
      named.has(line.feeId) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1
    ) {
      continue;
    }
    named.add(line.feeId);
    serviceCharges.push({
      feeId: line.feeId,
      name: line.label,
      unitPrice: line.amount,
      quantity: line.quantity,
      taxable: line.taxable !== false,
    });
    money += line.amount * line.quantity;
  }
  return { serviceCharges, money: round2(money) };
}

/**
 * What "Edit" hands the booking form, so staff redo the booking from the
 * estimate rather than from nothing: every pet on it, and the add-ons it sold
 * — a groom's into the groom's own list, anything else as chosen add-ons. Less
 * the units a service attaches by itself (`includedQuantity`): the form
 * derives those again, and would bill them twice. The form prices everything
 * itself; the estimate's own prices and fees stay with the estimate.
 */
export function estimateFormPreselection(estimate: Estimate): {
  petIds: number[];
  extraServices: ExtraService[];
  groomingAddOnIds: string[];
} {
  const lines = addOnLinesOf(estimate);
  if (estimate.service === "grooming") {
    return {
      petIds: [...estimate.petIds],
      extraServices: [],
      groomingAddOnIds: [...new Set(lines.map((line) => line.ref))],
    };
  }
  return {
    petIds: [...estimate.petIds],
    extraServices: lines.flatMap((line) => {
      const chosen = line.quantity - line.included;
      return chosen > 0
        ? [{ serviceId: line.ref, quantity: chosen, petId: line.petId }]
        : [];
    }),
    groomingAddOnIds: [],
  };
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
  const fees = estimateFees(estimate);
  const service = round2(estimate.subtotal - addOns.money - fees.money);

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
    // add-ons and the fees, which the server bills as lines.
    totalCost: service,
    ...(addOns.extraServices.length > 0
      ? { extraServices: addOns.extraServices }
      : {}),
    // ── THE FEES ARE FEE LINES, AND THE ONLY ONES ───────────────────────
    //
    // Each fee the estimate listed is written onto the bill as that fee's
    // line, at the amount quoted. And no automatic fee is added — not when the
    // booking is created, not at the till: the estimate listed every charge,
    // and those are what the customer accepted (`service_charges_included`,
    // 20260930231159). Until 2026-09-30 the fees were folded into the price,
    // and an at-checkout fee was then charged again at the till.
    ...(fees.serviceCharges.length > 0
      ? { serviceCharges: fees.serviceCharges }
      : {}),
    serviceChargesIncluded: true,
    kennel: estimate.roomType,
    specialRequests: notes || undefined,
  };
}

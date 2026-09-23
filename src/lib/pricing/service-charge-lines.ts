import type { CustomFee } from "@/types/boarding";

import { appliesToService } from "@/lib/policies/time-fee";

// ============================================================================
// A custom fee, turned into a line on the bill.
//
// ── THIS IS NOT A SECOND EVALUATOR ────────────────────────────────────────
//
// `shouldApplyCustomFee` in pricing-rules.ts still decides WHETHER a fee
// applies — every trigger mode, the customer segment, the add-on rules. This
// module only turns a fee that has already been chosen into money, and it
// exists so the three places that need that answer cannot disagree about it:
// the booking form's preview, the server's create path, and the till.
//
// Pure on purpose. No `server-only`, no `"use client"`, no database, no
// settings read — everything it needs arrives as an argument, which is what
// lets the server and the browser both call it.
//
// ── THE SERVICE-ONLY SUBSET ───────────────────────────────────────────────
//
// `automaticServiceCharges` answers the narrower question the SERVER can ask
// at booking creation: which fees depend on nothing but the service. That is
// MoéGo's own set — "auto-apply at checkout" and "by care type" — and it
// matters because the richer triggers (`new_customer`, `customer_segment`,
// `addon_purchase`) need context the create path does not have. Those are
// applied later, at the till, where the context exists.
// ============================================================================

export interface ServiceChargeLine {
  feeId: string;
  name: string;
  /** What one unit costs. `quantity` multiplies it. */
  unitPrice: number;
  quantity: number;
  /** A discount writes a negative `item`; see `kind` below. */
  kind: "item" | "fee";
}

export interface ServiceChargeContext {
  serviceId: string;
  /** How many pets the bill covers. `scope: "per_pet"` multiplies by it. */
  petCount: number;
  /**
   * The SERVICE's price — what a percentage fee is a percentage of.
   *
   * Never "the total so far": two percentage fees would then compound into
   * each other and the answer would depend on the order a facility happened
   * to author them in.
   */
  serviceTotal: number;
}

/** The fees a facility can apply knowing only which service was booked. */
export function automaticServiceCharges(
  fees: CustomFee[] | undefined,
  serviceId: string,
): CustomFee[] {
  return (fees ?? []).filter(
    (fee) =>
      fee.isActive &&
      appliesToService(serviceId, fee.applicableServices) &&
      (fee.autoApply === "at_checkout" ||
        (fee.autoApply === "by_care_type" &&
          appliesToService(serviceId, fee.autoApplyCareTypes))),
  );
}

/** The fees a member of staff can choose from by hand. MoéGo's default mode. */
export function manualServiceCharges(
  fees: CustomFee[] | undefined,
  serviceId: string,
): CustomFee[] {
  return (fees ?? []).filter(
    (fee) =>
      fee.isActive &&
      fee.autoApply === "none" &&
      appliesToService(serviceId, fee.applicableServices),
  );
}

/**
 * What one fee costs on this booking.
 *
 * Returns null when it comes to nothing — a percentage of a zero price, an
 * amount of zero. A line worth nothing is not a line; it is clutter on an
 * invoice and a row in a report that means nothing.
 */
export function serviceChargeLine(
  fee: CustomFee,
  context: ServiceChargeContext,
): ServiceChargeLine | null {
  const firstPetOnly = fee.scope !== "per_pet";
  const quantity = firstPetOnly ? 1 : Math.max(1, Math.round(context.petCount));

  const unit =
    fee.feeType === "percentage"
      ? (Math.max(0, context.serviceTotal) * Math.max(0, fee.amount)) / 100
      : Math.max(0, fee.amount);

  const uncapped = unit * quantity;
  const capped =
    fee.maxFee != null && fee.maxFee > 0
      ? Math.min(uncapped, fee.maxFee)
      : uncapped;
  if (capped <= 0) return null;

  // ── A CAPPED LINE IS ONE CHARGE, NOT A DIVIDED ONE ──────────────────────
  //
  // `booking_line_items.price` is GENERATED as `unit_price * quantity`, so a
  // unit that does not divide evenly is a bill that is wrong by cents and
  // stays wrong. A $25 cap over three pets is $8.3333 each, which rounds to
  // 8.33 and totals $24.99 — the facility set a cap of 25 and charged 24.99.
  //
  // When the cap binds, the fee stops being per-pet: "never more than $25" is
  // ONE charge of $25. So the line collapses to a single unit carrying the
  // whole amount, which is both the right money and the right sentence on an
  // invoice.
  const capBinds = capped < uncapped;
  const lineQuantity = capBinds ? 1 : quantity;

  const isDiscount = fee.adjustmentKind === "discount";
  const signed = isDiscount ? -capped : capped;

  return {
    feeId: fee.id,
    name: fee.name,
    // ── A DISCOUNT IS A NEGATIVE ITEM, NOT A NEGATIVE FEE ─────────────────
    //
    // `print-invoice.ts` groups `kind: "fee"` into its own Fees block, where
    // a negative number reads as a mistake. The membership discount already
    // writes a negative `item` for the same reason.
    kind: isDiscount ? "item" : "fee",
    unitPrice: round2(signed / lineQuantity),
    quantity: lineQuantity,
  };
}

/** Every automatic service charge this booking owes, in a stable order. */
export function serviceChargeLines(
  fees: CustomFee[] | undefined,
  context: ServiceChargeContext,
): ServiceChargeLine[] {
  return automaticServiceCharges(fees, context.serviceId)
    .map((fee) => serviceChargeLine(fee, context))
    .filter((line): line is ServiceChargeLine => line !== null);
}

/** What the lines add to the bill, to the cent. */
export function serviceChargesTotal(lines: ServiceChargeLine[]): number {
  return round2(
    lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

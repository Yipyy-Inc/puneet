import type { ExtraService } from "@/types/booking";
import type { CustomFee } from "@/types/boarding";

import { appliesToLocation, appliesToService } from "@/lib/policies/time-fee";

// ============================================================================
// A custom fee: whether it applies, and the line it becomes on the bill.
//
// ── ONE EVALUATOR, FOR THE FORM AND THE SERVER ────────────────────────────
//
// `customFeeApplies` and `customFeeCharge` decide every trigger — at checkout,
// by care type, a new customer, a new pet, a customer segment, an add-on
// bought — and what the fee comes to. The booking form's pricing engine
// (`applyDynamicPricingRules`) calls them for its quote, and the server calls
// them for the bill (lib/payments/booking-service-charges.ts), from the same
// FACTS gathered two ways: what is on the form, and what is in the database.
//
// Until 2026-09-30 only the form could decide the four richer triggers. It
// showed those fees in the quote and took them out of `total_cost`, since a
// fee is a line; the server wrote lines for the two service-only triggers and
// nothing wrote the rest. A new-customer fee was quoted and never charged.
//
// Pure on purpose. No `server-only`, no `"use client"`, no database, no
// settings read — everything it needs arrives as an argument, which is what
// lets the server and the browser both call it.
//
// ── THE SERVICE-ONLY SUBSET ───────────────────────────────────────────────
//
// `automaticServiceCharges` and `serviceChargeLine` answer the narrower
// question the TILL asks of a booking it has in front of it, and the manual
// "add a service charge" picker: which fees depend on nothing but the service,
// and what one costs for this many pets.
// ============================================================================

export interface ServiceChargeLine {
  feeId: string;
  name: string;
  /** What one unit costs. `quantity` multiplies it. */
  unitPrice: number;
  quantity: number;
  /** A discount writes a negative `item`; see `kind` below. */
  kind: "item" | "fee";
  /**
   * Whether the facility's tax applies to this line.
   *
   * Always set, never left to the caller to remember: `booking_line_items`
   * defaults it to true, so a line that MEANT to be exempt and forgot to say
   * so would be taxed, and nothing on the screen would show the difference.
   */
  taxable: boolean;
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
  /**
   * Which branch this booking is at, when the facility has more than one.
   *
   * Absent means "not a multi-location facility, or the row does not say",
   * and a fee narrowed to some branches still applies then — see
   * `appliesToLocation`. Losing a charge because a row has no branch on it is
   * the failure worth avoiding.
   */
  locationId?: string | null;
}

/** The fees a facility can apply knowing only which service was booked. */
export function automaticServiceCharges(
  fees: CustomFee[] | undefined,
  serviceId: string,
  locationId?: string | null,
): CustomFee[] {
  return (fees ?? []).filter(
    (fee) =>
      fee.isActive &&
      appliesToService(serviceId, fee.applicableServices) &&
      appliesToLocation(locationId, fee.applicableLocationIds) &&
      (fee.autoApply === "at_checkout" ||
        (fee.autoApply === "by_care_type" &&
          appliesToService(serviceId, fee.autoApplyCareTypes))),
  );
}

/**
 * The fees a member of staff can choose from by hand. The reference's default
 * mode.
 */
export function manualServiceCharges(
  fees: CustomFee[] | undefined,
  serviceId: string,
  locationId?: string | null,
): CustomFee[] {
  return (fees ?? []).filter(
    (fee) =>
      fee.isActive &&
      fee.autoApply === "none" &&
      appliesToService(serviceId, fee.applicableServices) &&
      appliesToLocation(locationId, fee.applicableLocationIds),
  );
}

/**
 * Every active fee a member of staff could put on THIS booking, whatever its
 * trigger — what the reference's "Add service charges" picker offers.
 *
 * Wider than `manualServiceCharges` on purpose. An automatic fee is offered
 * too, because the picker's job is to show the facility's whole list and mark
 * what the booking already carries; hiding the automatic ones would leave
 * staff wondering where the cleaning fee went. The ones already on the bill
 * are the caller's to disable — `booking_line_items.fee_id` says which.
 */
export function applicableServiceCharges(
  fees: CustomFee[] | undefined,
  serviceId: string,
  locationId?: string | null,
): CustomFee[] {
  return (fees ?? []).filter(
    (fee) =>
      fee.isActive &&
      appliesToService(serviceId, fee.applicableServices) &&
      appliesToLocation(locationId, fee.applicableLocationIds),
  );
}

/**
 * What this fee is worth at this branch.
 *
 * `amount` is the facility-wide figure and a branch overrides it only by
 * having an entry. Three cases are deliberately NOT overrides:
 *
 *   * no branch on the booking — every single-location facility, and every
 *     row written before branches existed. It charges the facility-wide
 *     amount rather than nothing.
 *   * a branch with no entry. Adding a location must not make every fee free
 *     there, so absence means "the usual price", never zero.
 *   * a non-finite or negative entry, which is a corrupted blob rather than a
 *     decision. ZERO, however, IS an override: "this branch does not charge
 *     for that" is a real thing to mean, and `serviceChargeLine` then drops
 *     the line because a fee worth nothing is not a line.
 *
 * For a percentage fee this returns the PERCENTAGE, not money — it answers
 * "what is `amount` here", and the caller already knows the `feeType`.
 */
export function feeAmountAt(
  fee: CustomFee,
  locationId?: string | null,
): number {
  if (!locationId) return fee.amount;
  const override = fee.locationPrices?.[locationId];
  if (override == null || !Number.isFinite(override) || override < 0) {
    return fee.amount;
  }
  return override;
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

  const amount = feeAmountAt(fee, context.locationId);
  const unit =
    fee.feeType === "percentage"
      ? (Math.max(0, context.serviceTotal) * Math.max(0, amount)) / 100
      : Math.max(0, amount);

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
    // Absent means taxed, matching every fee already stored and the column's
    // own default. Only an explicit `false` exempts it.
    taxable: fee.taxable !== false,
  };
}

/** Every automatic service charge this booking owes, in a stable order. */
export function serviceChargeLines(
  fees: CustomFee[] | undefined,
  context: ServiceChargeContext,
): ServiceChargeLine[] {
  return automaticServiceCharges(fees, context.serviceId, context.locationId)
    .map((fee) => serviceChargeLine(fee, context))
    .filter((line): line is ServiceChargeLine => line !== null);
}

/**
 * What the till adds at checkout: the facility's at-checkout and care-type
 * fees the bill does not carry yet — and nothing at all on a booking whose
 * charges an estimate stated (`serviceChargesIncluded`, 20260930231159). The
 * estimate's fees are on its bill already, as quoted, and the customer
 * accepted no others; a fee staff want to add is theirs to add by hand.
 */
export function serviceChargesAtTheTill(input: {
  fees: CustomFee[] | undefined;
  context: ServiceChargeContext;
  chargesStated: boolean;
  alreadyCharged: ReadonlySet<string>;
}): ServiceChargeLine[] {
  if (input.chargesStated) return [];
  return serviceChargeLines(input.fees, input.context).filter(
    (line) => !input.alreadyCharged.has(line.feeId),
  );
}

// ── EVERY TRIGGER, FROM THE FACTS OF ONE REQUEST ──────────────────────────

/** A client's segment, as the client record holds it. */
export interface FeeCustomerFacts {
  status?: string;
  membershipPlan?: string;
  membershipStatus?: string;
  storeCreditBalance?: number;
  hasPackageCredits?: boolean;
}

/**
 * What a fee is decided from, for one request — however many bookings the
 * form splits it into. The form fills it from the screen, the server from the
 * database; each field says what both must mean by it.
 */
export interface CustomFeeFacts extends ServiceChargeContext {
  /** The client had no booking before this request, whatever became of it. */
  isNewCustomer: boolean;
  /** Of the request's pets, how many were on no earlier booking. */
  newPetCount: number;
  customer?: FeeCustomerFacts;
  /** The request's add-on lines, named as a booking names them. */
  extraServices: readonly ExtraService[];
  /** An add-on's price at the request's location, by whatever a line names it by. */
  addOnPrice: (serviceId: string) => number | undefined;
}

/** Whether a fee applies to this request. `none` is chosen by hand, never here. */
export function customFeeApplies(
  fee: CustomFee,
  facts: CustomFeeFacts,
): boolean {
  if (!fee.isActive) return false;
  if (!appliesToService(facts.serviceId, fee.applicableServices)) return false;
  if (!appliesToLocation(facts.locationId, fee.applicableLocationIds)) {
    return false;
  }

  switch (fee.autoApply) {
    case "at_checkout":
      return true;
    case "by_care_type":
      return appliesToService(facts.serviceId, fee.autoApplyCareTypes);
    case "new_customer":
      return facts.isNewCustomer;
    case "new_pet":
      return facts.newPetCount > 0;
    case "customer_segment":
      return matchesCustomerSegment(fee, facts.customer);
    case "addon_purchase":
      return hasAddOnPurchaseTrigger(fee, facts.extraServices);
    default:
      return false;
  }
}

/** What a fee comes to on this request, before it is written as a line. */
export interface CustomFeeCharge {
  /** One unit, before a cap: per pet, per new pet, or the whole booking. */
  unitAmount: number;
  /** How many units: the pets, the new pets, or one. */
  quantity: number;
  /** The whole charge, after the cap. Never negative — see `isDiscount`. */
  total: number;
  isDiscount: boolean;
}

/**
 * What a fee that applies comes to. Null when that is nothing.
 *
 * A fee that WAIVES add-ons is worth a share of those add-ons' own price, and
 * is a discount unless the facility said otherwise; its units are the add-on
 * lines themselves, so it is never multiplied by the pets as well. A
 * percentage is of `serviceTotal`, fixed for every fee, so two percentages
 * cannot compound into each other.
 */
export function customFeeCharge(
  fee: CustomFee,
  facts: CustomFeeFacts,
): CustomFeeCharge | null {
  const waives =
    fee.autoApply === "addon_purchase" && (fee.waivedAddOnIds?.length ?? 0) > 0;
  const isDiscount =
    (fee.adjustmentKind ?? (waives ? "discount" : "fee")) === "discount";

  // `scope` counts pets for every trigger but one. A fee that waives add-ons
  // already derives from the add-on rows, and multiplying it by the pets
  // would count them twice. (Every add-on-triggered fee was once treated that
  // way, so a flat "$5 because they bought a bath" fee scoped per pet was
  // silently per booking.)
  let quantity = 1;
  if (fee.autoApply === "new_pet") {
    quantity = fee.scope === "per_pet" ? facts.newPetCount : 1;
  } else if (!waives) {
    quantity = fee.scope === "per_pet" ? Math.max(1, facts.petCount) : 1;
  }
  if (quantity <= 0) return null;

  let unitAmount: number;
  if (waives) {
    const share = Math.min(100, Math.max(0, fee.waivePercentage ?? 100)) / 100;
    unitAmount =
      waivedAddOnTotal(fee, facts.extraServices, facts.addOnPrice) * share;
  } else {
    const amount = feeAmountAt(fee, facts.locationId);
    unitAmount =
      fee.feeType === "percentage"
        ? (Math.max(0, facts.serviceTotal) * Math.max(0, amount)) / 100
        : Math.max(0, amount);
  }

  // A percentage of a three-week boarding stay is unbounded without this.
  // `maxFee` caps the WHOLE charge, not the unit, which is what a facility
  // means by "never more than $50".
  let total = unitAmount * quantity;
  if (fee.maxFee != null && fee.maxFee > 0) {
    total = Math.min(total, fee.maxFee);
  }
  if (total <= 0) return null;
  return { unitAmount, quantity, total, isDiscount };
}

/**
 * The fee as a line on the bill. A capped charge is one unit carrying the
 * whole amount, as `serviceChargeLine` says why; a discount is a negative
 * `item`.
 */
export function customFeeLine(
  fee: CustomFee,
  charge: CustomFeeCharge,
): ServiceChargeLine {
  const capBinds = charge.total < charge.unitAmount * charge.quantity;
  const quantity = capBinds ? 1 : charge.quantity;
  const signed = charge.isDiscount ? -charge.total : charge.total;
  return {
    feeId: fee.id,
    name: fee.name,
    kind: charge.isDiscount ? "item" : "fee",
    unitPrice: round2(signed / quantity),
    quantity,
    taxable: fee.taxable !== false,
  };
}

/** Every fee a request owes, whatever triggered it, in the facility's order. */
export function customFeeLines(
  fees: CustomFee[] | undefined,
  facts: CustomFeeFacts,
): ServiceChargeLine[] {
  return (fees ?? []).flatMap((fee) => {
    if (!customFeeApplies(fee, facts)) return [];
    const charge = customFeeCharge(fee, facts);
    return charge ? [customFeeLine(fee, charge)] : [];
  });
}

function lowerAll(values?: string[]): string[] {
  if (!values || values.length === 0) return [];
  return values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function matchesCustomerSegment(
  fee: CustomFee,
  customer?: FeeCustomerFacts,
): boolean {
  if (!customer) return false;

  const statusTargets = lowerAll(fee.customerStatuses);
  const planTargets = lowerAll(fee.membershipPlans);
  const requiresMembership = fee.requireMembershipActive === true;
  const requiresPrepaid = fee.requirePrepaidBalance === true;

  const hasCriteria =
    statusTargets.length > 0 ||
    planTargets.length > 0 ||
    requiresMembership ||
    requiresPrepaid;
  if (!hasCriteria) return false;

  if (statusTargets.length > 0) {
    const status = customer.status?.trim().toLowerCase();
    if (!status || !statusTargets.includes(status)) return false;
  }
  if (planTargets.length > 0) {
    const plan = customer.membershipPlan?.trim().toLowerCase();
    if (!plan || !planTargets.includes(plan)) return false;
  }
  if (requiresMembership) {
    const status = customer.membershipStatus?.trim().toLowerCase();
    if (status !== "active") return false;
  }
  if (requiresPrepaid) {
    const hasStoreCredit = (customer.storeCreditBalance ?? 0) > 0;
    if (!hasStoreCredit && !customer.hasPackageCredits) return false;
  }
  return true;
}

function hasAddOnPurchaseTrigger(
  fee: CustomFee,
  extraServices: readonly ExtraService[],
): boolean {
  const triggers = new Set(lowerAll(fee.triggerAddOnIds));
  if (triggers.size === 0) return false;
  return extraServices.some((line) =>
    triggers.has(line.serviceId.trim().toLowerCase()),
  );
}

function waivedAddOnTotal(
  fee: CustomFee,
  extraServices: readonly ExtraService[],
  addOnPrice: (serviceId: string) => number | undefined,
): number {
  const waived = new Set(lowerAll(fee.waivedAddOnIds));
  if (waived.size === 0) return 0;
  return extraServices.reduce((sum, line) => {
    if (!waived.has(line.serviceId.trim().toLowerCase())) return sum;
    const price = addOnPrice(line.serviceId);
    return price === undefined ? sum : sum + Math.max(0, price) * line.quantity;
  }, 0);
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

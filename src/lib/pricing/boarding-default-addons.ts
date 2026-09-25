import type { ExtraService } from "@/types/booking";
import type { ServiceAddOn } from "@/types/facility";

// ============================================================================
// A boarding service's DEFAULT ADD-ONS — attached to a stay by its length.
//
// A facility can say "every stay of this service gets a daily walk", "a bath
// on the last day once the stay is five nights", and so on. The rows live in
// `boarding_service_default_addons` (20260924210000); this is the one place a
// stay's dates become the quantities they add, so the booking form, the
// customer's quote and the server's re-price cannot count them differently.
//
// ── THE DAYS OF A STAY ────────────────────────────────────────────────────
//
// A stay of N nights touches N + 1 calendar days: Tuesday in, Friday out is
// three nights and four days. So, for a rule's quantity per day:
//
//   every_day         all N + 1 days, check-in and check-out included
//   except_checkout   N — every day but the day they go home
//   except_checkin    N — every day but the day they arrive
//   last_day          1 — the check-out day
//
// ── BILLED SEPARATELY, AS WHAT THEY ARE ───────────────────────────────────
//
// A default is an ordinary add-on line — `{ serviceId, quantity, petId }` —
// priced from the facility's catalogue exactly as a chosen one is. It is not
// folded into the nightly rate, so a receipt says "Daily walk × 4", not a
// bigger number for the room.
// ============================================================================

export type DefaultAddOnWhen =
  | "every_day"
  | "except_checkout"
  | "except_checkin"
  | "last_day";

export const DEFAULT_ADD_ON_WHENS: readonly DefaultAddOnWhen[] = [
  "every_day",
  "except_checkout",
  "except_checkin",
  "last_day",
];

export interface BoardingDefaultAddOn {
  /** The add-on's id in the facility's `service_addons` catalogue. */
  addOnId: string;
  appliesOn: DefaultAddOnWhen;
  /** How many on each day the rule covers. At least 1. */
  quantityPerDay: number;
  /** Attached once the stay is at least this many nights. Null: every stay. */
  minNights: number | null;
}

/** How many days of an N-night stay a rule covers. */
export function daysCovered(
  appliesOn: DefaultAddOnWhen,
  nights: number,
): number {
  if (!Number.isFinite(nights) || nights < 1) return 0;
  switch (appliesOn) {
    case "every_day":
      return nights + 1;
    case "except_checkout":
    case "except_checkin":
      return nights;
    case "last_day":
      return 1;
  }
}

/**
 * An add-on the facility can attach by length of stay. A percentage-of-booking
 * add-on is not one: its `price` is a percentage, and a quantity of days
 * multiplied into a percentage is not a price anybody set.
 */
export function canBeDefault(
  addOn: Pick<ServiceAddOn, "pricingType">,
): boolean {
  return addOn.pricingType !== "percentage_of_booking";
}

/**
 * The add-on lines a stay of `nights` nights gets from its service's defaults.
 *
 * One line per pet, or one for the booking when the add-on says it is per
 * booking — a pick-up is not fetched twice for two dogs. A default whose
 * add-on the facility has since removed or switched off attaches nothing,
 * rather than a line nobody can price.
 */
export function defaultAddOnLines({
  defaults,
  nights,
  petIds,
  catalogue,
}: {
  defaults: readonly BoardingDefaultAddOn[];
  nights: number;
  petIds: readonly number[];
  catalogue: readonly ServiceAddOn[];
}): ExtraService[] {
  if (petIds.length === 0) return [];
  const lines: ExtraService[] = [];
  for (const rule of defaults) {
    if (rule.minNights !== null && nights < rule.minNights) continue;
    const addOn = catalogue.find((a) => a.id === rule.addOnId);
    if (!addOn || !addOn.isActive || !canBeDefault(addOn)) continue;
    const quantity =
      Math.max(1, Math.round(rule.quantityPerDay)) *
      daysCovered(rule.appliesOn, nights);
    if (quantity <= 0) continue;
    const pets = addOn.petScope === "per_booking" ? petIds.slice(0, 1) : petIds;
    for (const petId of pets) {
      lines.push({ serviceId: addOn.id, quantity, petId });
    }
  }
  return lines;
}

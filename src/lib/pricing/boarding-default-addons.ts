import type { BookableAddOn } from "@/lib/add-ons/bookable";
import type { ExtraService } from "@/types/booking";

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
  /**
   * What the rule names its add-on by. `addon_id` is text: the rates screen
   * writes the add-on's ref (`addOnRef`), and anything else may write the
   * row's uuid. `defaultAddOnLines` finds it by either.
   */
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
 * The add-on lines a stay of `nights` nights gets from its service's defaults.
 *
 * One line per pet, named as a chosen line names it (the add-on's ref), so a
 * default and the same add-on chosen by hand are one line. A default whose
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
  catalogue: readonly Pick<BookableAddOn, "ref" | "rowId" | "isActive">[];
}): ExtraService[] {
  if (petIds.length === 0) return [];
  const lines: ExtraService[] = [];
  for (const rule of defaults) {
    if (rule.minNights !== null && nights < rule.minNights) continue;
    const addOn = catalogue.find(
      (a) => a.rowId === rule.addOnId || a.ref === rule.addOnId,
    );
    if (!addOn || !addOn.isActive) continue;
    const quantity =
      Math.max(1, Math.round(rule.quantityPerDay)) *
      daysCovered(rule.appliesOn, nights);
    if (quantity <= 0) continue;
    for (const petId of petIds) {
      lines.push({ serviceId: addOn.ref, quantity, petId });
    }
  }
  return lines;
}

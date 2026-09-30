import { termsAt, type AddOnTerms } from "@/lib/add-ons/availability";
import type { AddOn, AddOnCategory } from "@/types/add-on";

// ============================================================================
// AN ADD-ON AS A BOOKING READS IT (2026-09-30).
//
// The row (`AddOn`) is what Settings edits. A booking needs two things of it
// that the row's own fields answer wrongly, with no type error to say so:
//
//   WHAT IT IS NAMED BY. A booking, a bill line's `source_id`, a service's
//   default or included add-ons, a pricing rule's triggers and a QuickBooks
//   mapping each hold a STRING — the id the add-on had before the one list
//   (20260926223644) where it has one, else its row's uuid. That is `ref`
//   here, and it is what the screens write, so a booking made before the one
//   list and one made today name the same add-on the same way. The row's
//   uuid names it too (it is what the API and the database hand out), so a
//   READER accepts either, as the database does (`legacy_id` or
//   `id::text`): `bookableLookup`, `namesAddOn`.
//
//   WHAT IT COSTS HERE. Price, tax and minutes are the booking LOCATION'S,
//   which may override the add-on's own.
//
// So the booking screens and the pricing they share with the server read this
// shape, which has no `id` to compare a selection with by mistake and no
// price but the one the bill will say.
//
// It replaces the JSON's `ServiceAddOn`, which the one list was turned back
// into for about thirty screens until each was rewritten — a shape whose `id`
// was the old id where there was one, with a price unit, a scope and a dozen
// flags the one list does not have, each frozen at the value that kept the
// old arithmetic working.
// ============================================================================

export interface BookableAddOn {
  /** What a booking names it by: the id it had before the one list, else the row's uuid. */
  ref: string;
  /** The row's uuid, which may name it too. */
  rowId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  /**
   * Its category's name, as the facility wrote it. Read by one thing: a
   * bundle pricing rule, which names a kind of service rather than an add-on
   * and looks for one in a matching category.
   */
  category: string | null;
  isActive: boolean;
  /** "Does this add-on require staff?" — the line is assigned to somebody. */
  requiresStaff: boolean;
  /** At the booking's location. */
  price: number;
  taxable: boolean;
  /** Minutes it adds to the appointment, at the booking's location. */
  durationMin: number;
}

/** What a record that holds a string names this add-on by. See the header. */
export function addOnRef(addOn: Pick<AddOn, "id" | "legacyId">): string {
  return addOn.legacyId ?? addOn.id;
}

/** Whether a stored id names this add-on: its ref, or its row's uuid. */
export function namesAddOn(
  id: string,
  addOn: Pick<AddOn, "id" | "legacyId">,
): boolean {
  return id === addOn.id || (addOn.legacyId !== null && id === addOn.legacyId);
}

/** The add-on on terms already decided for a booking (`addOnFor`). */
export function bookable(
  addOn: AddOn,
  terms: Pick<AddOnTerms, "price" | "taxable" | "durationMin">,
  categories: readonly AddOnCategory[] = [],
): BookableAddOn {
  return {
    ref: addOnRef(addOn),
    rowId: addOn.id,
    name: addOn.name,
    description: addOn.description,
    imageUrl: addOn.imageUrl,
    category: categories.find((c) => c.id === addOn.categoryId)?.name ?? null,
    isActive: addOn.isActive,
    requiresStaff: addOn.requiresStaff,
    price: terms.price,
    taxable: terms.taxable,
    durationMin: terms.durationMin,
  };
}

/** The add-on at one location's price, tax and minutes. No location, its own. */
export function bookableAt(
  addOn: AddOn,
  locationId?: string | null,
  categories: readonly AddOnCategory[] = [],
): BookableAddOn {
  return bookable(addOn, termsAt(addOn, locationId), categories);
}

/**
 * The add-ons by whatever a record names them by — ref or row uuid. Were one
 * add-on's old id ever another's uuid, the ref would win: it is what bookings
 * hold.
 */
export function bookableLookup<T extends Pick<BookableAddOn, "ref" | "rowId">>(
  addOns: readonly T[],
): ReadonlyMap<string, T> {
  const lookup = new Map<string, T>();
  for (const addOn of addOns) lookup.set(addOn.rowId, addOn);
  for (const addOn of addOns) lookup.set(addOn.ref, addOn);
  return lookup;
}

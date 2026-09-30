import type { AddOn } from "@/types/add-on";

// ============================================================================
// WHAT A BOOKING'S LINE SAYS ABOUT AN ADD-ON (2026-09-30).
//
// An add-on on a booking is a bill line with its own name, price, tax and
// minutes — the add-on's, or its location's override of them. After an edit
// the facility is asked whether the bookings not yet confirmed should take
// the new values; that is only worth asking when one of THOSE changed. A new
// description, picture, colour or pet limit changes nothing a bill carries.
// ============================================================================

type Billed = Pick<
  AddOn,
  "name" | "price" | "taxable" | "durationMin" | "overrides"
>;

function termsOf(addOn: Billed): string {
  const overrides = addOn.overrides
    .map((o) =>
      [o.locationId, o.price ?? "", o.taxable ?? "", o.durationMin ?? ""].join(
        "|",
      ),
    )
    .sort();
  return JSON.stringify([
    addOn.name.trim(),
    addOn.price,
    addOn.taxable,
    addOn.durationMin,
    overrides,
  ]);
}

/** Whether an edit changed anything a booking's line for it carries. */
export function billedTermsChanged(before: Billed, after: Billed): boolean {
  return termsOf(before) !== termsOf(after);
}

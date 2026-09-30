import { bookableLookup, type BookableAddOn } from "@/lib/add-ons/bookable";
import type { ExtraService } from "@/types/booking";

// ============================================================================
// AN ESTIMATE'S ADD-ONS, ONE LINE EACH (2026-09-30).
//
// The booking form wrote an estimate's add-ons as ONE line, "Add-ons", with
// their money. A booking made from that estimate took the money into its own
// price, so the add-ons were on no bill line: no tax of their own, nobody
// assigned, nothing named on the receipt — everything add-ons have been since
// they became lines (20260930153912).
//
// So each add-on is a line of the estimate, at the price the form quoted,
// carrying what a booking names it by (`addOnRef`) and the pet it is for.
// Converting the estimate sends those as the booking's add-ons
// (lib/estimates/convert-estimate.ts).
// ============================================================================

/** An estimate line that sells an add-on, as the estimates route takes it. */
export interface EstimateAddOnLine {
  label: string;
  amount: number;
  quantity: number;
  addOnRef: string;
  petRef: number;
}

/** A groom's add-ons: the ids chosen, on the pet being groomed. */
export interface GroomAddOns {
  addOnIds: readonly string[];
  petRef: number;
  offers: readonly { id: string; name: string; price: number }[];
}

/**
 * The form's add-on lines as estimate lines, at the prices the form quoted.
 * An add-on the price list no longer has is left out, as the quote left it.
 */
export function estimateAddOnLines(input: {
  lines: readonly ExtraService[];
  catalogue: readonly Pick<BookableAddOn, "ref" | "rowId" | "name" | "price">[];
  groom?: GroomAddOns;
}): EstimateAddOnLine[] {
  const byRef = bookableLookup(input.catalogue);
  const chosen = input.lines.flatMap((line) => {
    const addOn = byRef.get(line.serviceId);
    return addOn && line.quantity > 0
      ? [
          {
            label: addOn.name,
            amount: addOn.price,
            quantity: line.quantity,
            addOnRef: line.serviceId,
            petRef: line.petId,
          },
        ]
      : [];
  });

  const groom = input.groom;
  const groomed = groom
    ? groom.addOnIds.flatMap((id) => {
        const offer = groom.offers.find((o) => o.id === id);
        return offer
          ? [
              {
                label: offer.name,
                amount: offer.price,
                quantity: 1,
                addOnRef: offer.id,
                petRef: groom.petRef,
              },
            ]
          : [];
      })
    : [];

  return [...chosen, ...groomed];
}

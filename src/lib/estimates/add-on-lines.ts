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
//
// Each line also says what the form knew and a booking cannot work out again
// from the estimate: whether the add-on is taxed, and how many of its units
// the service attaches by itself (a boarding service's default add-ons). The
// booking form derives those itself when "Edit" reopens the estimate as a
// booking, and must not be handed them a second time.
// ============================================================================

/** An estimate line that sells an add-on, as the estimates route takes it. */
export interface EstimateAddOnLine {
  label: string;
  amount: number;
  quantity: number;
  addOnRef: string;
  petRef: number;
  /** Only when the add-on is not taxed; absent means taxed, as on every line. */
  taxable?: false;
  /** Of `quantity`, the units the service attaches by itself. */
  includedQuantity?: number;
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
 *
 * `included` is the share of `lines` the service attached by itself — the
 * boarding defaults the form merged into them.
 */
export function estimateAddOnLines(input: {
  lines: readonly ExtraService[];
  catalogue: readonly Pick<
    BookableAddOn,
    "ref" | "rowId" | "name" | "price" | "taxable"
  >[];
  included?: readonly ExtraService[];
  groom?: GroomAddOns;
}): EstimateAddOnLine[] {
  const byRef = bookableLookup(input.catalogue);
  const untaxed = (ref: string) => byRef.get(ref)?.taxable === false;

  const includedBy = new Map<string, number>();
  for (const line of input.included ?? []) {
    const key = `${line.serviceId}::${line.petId}`;
    includedBy.set(key, (includedBy.get(key) ?? 0) + line.quantity);
  }

  const chosen = input.lines.flatMap((line): EstimateAddOnLine[] => {
    const addOn = byRef.get(line.serviceId);
    if (!addOn || line.quantity <= 0) return [];
    const included = Math.min(
      line.quantity,
      includedBy.get(`${line.serviceId}::${line.petId}`) ?? 0,
    );
    return [
      {
        label: addOn.name,
        amount: addOn.price,
        quantity: line.quantity,
        addOnRef: line.serviceId,
        petRef: line.petId,
        ...(untaxed(line.serviceId) ? { taxable: false as const } : {}),
        ...(included > 0 ? { includedQuantity: included } : {}),
      },
    ];
  });

  const groom = input.groom;
  const groomed = groom
    ? groom.addOnIds.flatMap((id): EstimateAddOnLine[] => {
        const offer = groom.offers.find((o) => o.id === id);
        return offer
          ? [
              {
                label: offer.name,
                amount: offer.price,
                quantity: 1,
                addOnRef: offer.id,
                petRef: groom.petRef,
                ...(untaxed(offer.id) ? { taxable: false as const } : {}),
              },
            ]
          : [];
      })
    : [];

  return [...chosen, ...groomed];
}

import type { YipyyGoOfferedAddOn } from "@/lib/api/mappers/yipyy-go";

// ============================================================================
// What a chosen add-on will put on the bill, before the form is sent.
//
// The database prices every charge (private.yipyy_go_price_add_on and
// yipyy_go_stay_days, 20260913135000) and never takes a price from the
// request, so these figures are an ESTIMATE the screen shows while the owner
// chooses. After sending, the screen shows the charges the server returned.
// The two rules are mirrored here, and the unit test holds them to the SQL.
// ============================================================================

/**
 * The days a per-day charge counts: nights for boarding, the days spanned for
 * everything else. From the booking's facility-local `YYYY-MM-DD` dates.
 */
export function stayDaysFor(
  service: string,
  startDate: string,
  endDate: string,
): number {
  const day = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  };
  const spanned = Math.round((day(endDate) - day(startDate)) / 86_400_000);
  if (!Number.isFinite(spanned)) return 1;
  return service === "boarding"
    ? Math.max(1, spanned)
    : Math.max(1, spanned + 1);
}

export interface AddOnLineEstimate {
  unitPrice: number;
  quantity: number;
  total: number;
}

/** One requested add-on as the database will price it. */
export function addOnLine(
  offer: Pick<YipyyGoOfferedAddOn, "pricingType" | "unitPrice" | "maxQuantity">,
  requested: number,
  stayDays: number,
): AddOnLineEstimate {
  const asked = Number.isFinite(requested) ? Math.floor(requested) : 1;
  const chosen = Math.min(Math.max(asked, 1), Math.max(1, offer.maxQuantity));
  const quantity =
    offer.pricingType === "flat" ||
    offer.pricingType === "percentage_of_booking"
      ? 1
      : offer.pricingType === "per_day"
        ? chosen * Math.max(1, stayDays)
        : chosen;
  return {
    unitPrice: offer.unitPrice,
    quantity,
    total: Math.round(offer.unitPrice * quantity * 100) / 100,
  };
}

/** Whether the owner picks how many: a flat or percentage add-on is one. */
export function takesQuantity(
  offer: Pick<YipyyGoOfferedAddOn, "pricingType" | "maxQuantity">,
): boolean {
  return (
    offer.maxQuantity > 1 &&
    offer.pricingType !== "flat" &&
    offer.pricingType !== "percentage_of_booking"
  );
}

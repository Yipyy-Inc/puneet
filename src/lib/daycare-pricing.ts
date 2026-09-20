import type { DaycareRate } from "@/types/daycare";

// ============================================================================
// What one daycare day costs before rules.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `daycare_config.basePrice` — 35 for any facility that had never edited it,
// a fixture's number, identical across the product. The booking wizard priced
// a day from it and halved it for a half day.
//
// Meanwhile the facility's OWN rates sat in `daycare_rates`, set on the
// Daycare → Rates screen — "Full day $38, up to 10 hours", "Half day $24" —
// and the wizard read them only to decide which sections a rate may be booked
// into. It never priced from them. A facility could set its rate card and
// watch every booking charge 35.
//
// So: a branch's own price wins where it has one (it exists to override the
// facility's rate for that branch), then the rate card for the kind of day
// being booked. Neither is a guess. A facility with neither has not set a
// daycare price yet, and `null` says exactly that — the caller refuses the
// booking rather than inventing a number or charging nothing.
// ============================================================================

export interface DaycareDayRateInput {
  /** This branch's own daycare price, when it has set one. */
  branchPrice?: number | null;
  /** The facility's daycare rate cards, active and inactive. */
  rates: DaycareRate[];
  /** A half day rather than a full one. */
  half: boolean;
}

function activeRate(rates: DaycareRate[], type: string): number | null {
  const rate = rates.find((r) => r.type === type && r.isActive);
  return rate ? rate.basePrice : null;
}

/**
 * The price of one daycare day, or null when the facility has set none.
 *
 * A branch price is a full day's, so a half day is half of it — that is the
 * arithmetic the wizard has always done and the column holds one number. An
 * explicit half-day rate is only reached where the branch has no price of its
 * own, because a branch override is meant to replace the facility's rate at
 * that address rather than sit beside it.
 */
export function daycareDayRate({
  branchPrice,
  rates,
  half,
}: DaycareDayRateInput): number | null {
  if (branchPrice != null) return half ? branchPrice / 2 : branchPrice;
  if (half) {
    const halfDay = activeRate(rates, "half-day");
    if (halfDay != null) return halfDay;
    const fullDay = activeRate(rates, "full-day");
    return fullDay == null ? null : fullDay / 2;
  }
  return activeRate(rates, "full-day");
}

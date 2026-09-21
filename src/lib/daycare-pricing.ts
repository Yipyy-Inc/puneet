import type { DaycareRate } from "@/types/daycare";
import { speciesAllows } from "@/lib/settings/species";

// ============================================================================
// What one daycare day costs before rules.
//
// ── WHAT IT REPLACED, TWICE ───────────────────────────────────────────────
//
// First, `daycare_config.basePrice` — 35 for any facility that had never
// edited it, a fixture's number, identical across the product. A facility
// could set its rate card and watch every booking charge 35.
//
// Then the rate card was read BY TYPE: a half day asked for a rate typed
// `half-day`, a full day for one typed `full-day`. A label cannot carry a
// number. Half a day is five hours at one business and three at another, and
// the type said neither — so the facility set the hours on the rate and
// nothing read them (`durationHours` was display-only).
//
// It failed in the ordinary case, not an exotic one. Doggieville set ONE rate,
// "Daycare Half Day, $45, 5 hours". Every FULL day booking there looked for a
// `full-day` rate, found none, and the wizard told a facility that had just
// saved a rate card that it had "no daycare rate yet". Reported by the client
// on 2026-09-21 as two separate complaints.
//
// ── WHAT DECIDES NOW ──────────────────────────────────────────────────────
//
// The length of the stay, against what each rate says it covers. A facility
// names its own services — "Half day", "School run", "Full day" — and says how
// many hours each runs to. The booking takes the CHEAPEST rate that covers it.
//
// Cheapest rather than closest: two rates that both cover four hours are two
// prices for the same stay, and charging the higher one because it was listed
// first is not a rule anybody agreed to.
//
// A stay longer than every rate is NOT priced by stretching the longest one.
// It returns null, and the caller says which is missing — the same answer as
// having no rates at all, because for that stay the facility has none.
// ============================================================================

/** Hourly is one hour; a half day was five; a full day, ten. */
const LEGACY_HOURS: Record<string, number> = {
  hourly: 1,
  "half-day": 5,
  "full-day": 10,
};

/**
 * How long a rate covers, for a rate card saved before it could say.
 *
 * Stored settings are not rewritten — `settingsFromRows` drops a domain whose
 * value stops parsing, so a migration that touched every facility's rate card
 * is exactly the change that could delete one. The old fields are read instead,
 * newest meaning first: the explicit hours the facility typed, then what its
 * type implied.
 */
export function maxRateHours(rate: DaycareRate): number {
  if (typeof rate.maxDurationHours === "number" && rate.maxDurationHours > 0) {
    return rate.maxDurationHours;
  }
  // `durationHours` was shown beside the price and never read. A facility that
  // typed 5 there meant it, so it outranks the type's guess.
  if (typeof rate.durationHours === "number" && rate.durationHours > 0) {
    return rate.durationHours;
  }
  return LEGACY_HOURS[rate.type ?? ""] ?? 0;
}

export interface DaycareDayRateInput {
  /** This branch's own daycare price, when it has set one. */
  branchPrice?: number | null;
  /** The facility's daycare rate cards, active and inactive. */
  rates: DaycareRate[];
  /**
   * How long the stay is, in hours. Undefined means "a day" — the caller does
   * not know, so every active rate is a candidate and the cheapest wins.
   */
  hours?: number;
  /**
   * The animal being booked, in whatever words its record uses.
   *
   * A rate may be offered to some species rather than all. Undefined means the
   * caller does not know, and every rate is a candidate — never "no rate".
   */
  species?: string;
}

/**
 * The rate that covers a stay of `hours`, or null when none does.
 *
 * Exported separately from the price so a screen can name the rate it charged
 * — "Half day, $45" is worth more on a receipt than $45.
 */
export function daycareRateForHours(
  rates: DaycareRate[],
  hours?: number,
  species?: string,
): DaycareRate | null {
  // A rate offered to some species rather than all is out for anything else.
  // `speciesAllows` folds case: pets.species is free text and one facility
  // already holds a "dog" beside a "Dog".
  const active = rates.filter(
    (r) => r.isActive && speciesAllows(r.species, species),
  );
  if (active.length === 0) return null;

  const covering =
    hours === undefined
      ? active
      : active.filter((r) => {
          const max = maxRateHours(r);
          // A rate that never said how long it runs covers anything; refusing
          // it would price nothing for a facility mid-migration.
          return max <= 0 || max >= hours;
        });

  if (covering.length === 0) return null;
  return covering.reduce((cheapest, rate) =>
    rate.basePrice < cheapest.basePrice ? rate : cheapest,
  );
}

/**
 * The price of one daycare day, or null when the facility has set none.
 *
 * A branch price wins where it has one — it exists to override the facility's
 * rate at that address. It is a whole day's price and is not scaled by the
 * hours, because one number cannot say what a shorter stay costs; a facility
 * wanting that sets a shorter rate.
 */
export function daycareDayRate({
  branchPrice,
  rates,
  hours,
  species,
}: DaycareDayRateInput): number | null {
  if (branchPrice != null) return branchPrice;
  return daycareRateForHours(rates, hours, species)?.basePrice ?? null;
}

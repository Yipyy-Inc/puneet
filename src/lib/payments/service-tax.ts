// ============================================================================
// WHICH PART OF A BOOKING'S BALANCE IS TAXED.
//
// ── THE SWITCH THE FACILITY ASKED FOR ─────────────────────────────────────
//
// Reported 2026-09-21: "if they want to skip taxes for any service we can
// unselect taxes". A facility sells some things it must charge tax on and some
// it must not — a training course, a boarding class, a nail trim — and until
// now the tax config was all-or-nothing for the whole business.
//
// So every priced service carries `taxable`. It is OPTIONAL everywhere and
// absent means TAXED, in every schema, in every direction:
//
//   - a rate card saved before this existed keeps charging tax, which is what
//     it did yesterday and what the facility's returns already assume;
//   - a facility that never opens the screen changes nothing;
//   - a field that fails to load, parse or reach the server charges tax.
//
// That asymmetry is the whole safety property. Charging tax that was not owed
// is a refund; NOT charging tax that was owed is the facility's own money, paid
// out of their pocket to the government, discovered at year end. So this module
// only ever stops charging tax when something positively said so.
//
// ── EXTRAS ARE NOT THE SERVICE ────────────────────────────────────────────
//
// A tax-exempt service does not make the whole booking tax-exempt. `amount_due`
// is `total_cost + extras_total - discount`: the service the facility priced,
// plus whatever was added at the counter. A treat, a medication fee and a bag
// of food are supplies of their own and stay taxed — exactly as the retail
// counter already treats a non-taxable product sitting in a taxable cart.
//
// ── A BALANCE IS A MIXTURE, SO IT IS SPLIT IN PROPORTION ──────────────────
//
// Tax is charged on what is still OWED, and a part payment does not say which
// part it settled. Neither does a discount. So the taxable share of the balance
// is the taxable share of the bill — the same proportional allocation the
// retail page has used for discounts since it was written. Two people paying
// half each are taxed the same amount in total as one person paying once.
// ============================================================================

/** What a priced thing says about tax. Absent means taxed — see the header. */
export interface MaybeTaxable {
  taxable?: boolean;
}

/**
 * Whether a rate, room class, grooming service or module charges tax.
 *
 * Takes `null` and `undefined` because every caller is looking something up
 * that may not be there any more, and a rate that has been deleted is not a
 * reason to stop charging tax on a booking that used it.
 */
export function chargesTax(priced: MaybeTaxable | null | undefined): boolean {
  return priced?.taxable !== false;
}

export interface TaxableBillInput {
  /** What the booking's own service costs — `bookings.total_cost`. */
  totalCost: number;
  /** Everything added to it — `bookings.extras_total`. */
  extrasTotal: number;
  /** Whether the SERVICE is taxed. Extras always are. */
  serviceTaxable: boolean;
}

/**
 * The taxable fraction of a bill, between 0 and 1.
 *
 * 1 when there is nothing to go on: a bill of zero, or a negative one, has no
 * proportion to take, and the answer that charges tax is the safe one.
 */
export function taxableFraction({
  totalCost,
  extrasTotal,
  serviceTaxable,
}: TaxableBillInput): number {
  if (serviceTaxable) return 1;

  const service = Number.isFinite(totalCost) ? Math.max(0, totalCost) : 0;
  const extras = Number.isFinite(extrasTotal) ? Math.max(0, extrasTotal) : 0;
  const gross = service + extras;
  if (gross <= 0) return 1;

  return extras / gross;
}

/**
 * How much of `owedCents` the facility's tax applies to.
 *
 * Rounded to the cent, and never above what is owed — a fraction of 1 must
 * return the input unchanged, or an exempt-free facility's total would move by
 * a rounding error on every booking in the product.
 */
/**
 * The same split, for a mapped `Booking` rather than a database row.
 *
 * The screens work in camelCase and the routes in snake_case, and one of the
 * two would otherwise grow its own copy of the arithmetic — which is how a
 * page ends up showing a different tax from the one the card is charged.
 */
export function taxableOwedForBooking(
  booking: { totalCost?: number; extrasTotal?: number; taxable?: boolean },
  owedCents: number,
): number {
  return taxableOwedCents(owedCents, {
    totalCost: booking.totalCost ?? 0,
    extrasTotal: booking.extrasTotal ?? 0,
    serviceTaxable: booking.taxable !== false,
  });
}

export function taxableOwedCents(
  owedCents: number,
  bill: TaxableBillInput,
): number {
  if (!Number.isFinite(owedCents) || owedCents <= 0) return 0;
  const fraction = taxableFraction(bill);
  if (fraction >= 1) return owedCents;
  if (fraction <= 0) return 0;
  return Math.min(owedCents, Math.round(owedCents * fraction));
}

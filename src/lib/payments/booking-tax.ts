import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeTax,
  NO_TAX,
  taxConfigSchema,
  type TaxConfig,
} from "@/lib/settings/tax";
import { taxableOwedCents } from "@/lib/payments/service-tax";

// ============================================================================
// The tax a card payment on a booking ADDS to what is owed.
//
// A booking's balance (`amount_due - amount_paid`) is the SUPPLY: tax is never
// in it (20260819210000) and lives on the payment instead. The terminal route
// has added the facility's tax since 2026-08-27; the card route — the saved
// card at the counter and the customer's pay-by-card link — charged the
// pre-tax figure until 2026-09-11, so a facility charging GST and QST
// collected no tax on any card that was not tapped on a terminal.
//
// One helper for both, so the page that shows the amount and the route that
// charges it cannot disagree. A facility whose prices include tax adds
// nothing: the tax is already inside the marked price.
// ============================================================================

// The ADMIN client where the payer is the customer: a customer cannot read
// `facility_settings` under RLS, and a tax nobody could read is a tax not
// charged. Callers establish the booking through the caller's own client
// first — this only reads the facility's published rate.
export async function facilityTaxConfig(
  // Untyped on purpose: the admin client is, and only `facility_settings` is
  // read — its `value` is parsed below, not trusted.
  supabase: SupabaseClient,
  facilityId: string,
): Promise<TaxConfig> {
  const { data } = await supabase
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", "tax_config")
    .maybeSingle();
  // Parsed, not cast: a malformed row means no tax line, never a thrown
  // payment — the same rule the terminal route follows.
  const parsed = taxConfigSchema.safeParse(data?.value);
  return parsed.success ? parsed.data : NO_TAX;
}

/**
 * The booking's own money, as far as tax is concerned.
 *
 * `total_cost` is the service the facility priced, `extras_total` is what was
 * added at the counter, `taxable_extras_total` is the part of that the tax
 * applies to (20260923200000), and `taxable` is whether the SERVICE is taxed.
 *
 * A NULL `taxable_extras_total` is a row read before that column existed, and
 * means every extra is taxed — which is what this file assumed outright until
 * a service charge could say otherwise.
 */
export interface BookingBill {
  total_cost?: number | string | null;
  extras_total?: number | string | null;
  taxable_extras_total?: number | string | null;
  taxable?: boolean | null;
}

function num(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** The part of a balance the facility's tax applies to. */
export function taxableOwedOf(bill: BookingBill, owedCents: number): number {
  return taxableOwedCents(owedCents, {
    totalCost: num(bill.total_cost),
    extrasTotal: num(bill.extras_total),
    taxableExtrasTotal:
      bill.taxable_extras_total == null
        ? undefined
        : num(bill.taxable_extras_total),
    // Null is a row read before the column existed, which is not a decision to
    // stop charging tax.
    serviceTaxable: bill.taxable !== false,
  });
}

/**
 * The tax a payment of `owedCents` adds.
 *
 * `bill` is REQUIRED rather than optional, and that is the point: a facility
 * can mark a service tax-free since 2026-09-21, and an optional argument would
 * have let every call site that was not updated go on charging tax on it with
 * no error anywhere. Making it required turns "a checkout nobody remembered"
 * into a compile failure.
 */
export function taxToAddCents(
  config: TaxConfig,
  owedCents: number,
  bill: BookingBill,
): number {
  if (config.pricesIncludeTax || owedCents <= 0) return 0;
  return computeTax(taxableOwedOf(bill, owedCents), config).totalCents;
}

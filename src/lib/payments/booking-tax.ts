import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeTax,
  NO_TAX,
  taxConfigSchema,
  type TaxConfig,
} from "@/lib/settings/tax";

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

export function taxToAddCents(config: TaxConfig, owedCents: number): number {
  if (config.pricesIncludeTax || owedCents <= 0) return 0;
  return computeTax(owedCents, config).totalCents;
}

import type { createServerClient } from "@/lib/supabase/server";

/**
 * Replace one daycare service's branch prices.
 *
 * ── WHY THIS IS NOT IN THE ROUTE FILE ─────────────────────────────────────
 *
 * Both the POST and the PATCH need it, and a Next route module may only export
 * HTTP methods and its config — exporting a helper from one and importing it
 * into the other fails the route type check at build time.
 *
 * ── REPLACED, NOT MERGED ──────────────────────────────────────────────────
 *
 * A branch removed from the map must LOSE its override. A merge would leave it
 * charging a price the facility had just deleted, which is the failure
 * `api/grooming/services/[id]` documents about size prices.
 *
 * The key is a location uuid, or `facility` for the facility-wide row —
 * `location_id` null, the one the two partial unique indexes allow exactly one
 * of (20260924120000).
 *
 * ── IT REPORTS RATHER THAN THROWS ─────────────────────────────────────────
 *
 * Prices are gated by `manage_rates`, the service by `manage_services`. A
 * caller holding only the second creates a service and cannot price it, which
 * is a correct outcome and not a reason to fail the whole request. `false`
 * means "the service is saved, the prices are not".
 */
export async function writeBranchPrices(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  serviceId: string,
  facilityId: string,
  branchPrices: Record<string, number> | undefined,
): Promise<boolean> {
  if (!branchPrices) return true;

  const { error: deleteError } = await supabase
    .from("daycare_service_location_prices")
    .delete()
    .eq("service_id", serviceId)
    .select("id");

  if (deleteError) return false;

  const rows = Object.entries(branchPrices)
    .filter(([, price]) => Number.isFinite(Number(price)))
    .map(([key, price]) => ({
      service_id: serviceId,
      // Derived by a trigger anyway; sent so the insert is well formed.
      facility_id: facilityId,
      location_id: key === "facility" ? null : key,
      price: Math.max(0, Number(price)),
    }));

  if (rows.length === 0) return true;

  const { data: written, error } = await supabase
    .from("daycare_service_location_prices")
    .insert(rows)
    .select("id");

  if (error) return false;
  // An RLS-refused INSERT returns no rows and no error, so count them.
  return (written?.length ?? 0) === rows.length;
}

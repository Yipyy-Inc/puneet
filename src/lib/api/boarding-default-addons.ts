import type { createServerClient } from "@/lib/supabase/server";
import type { BoardingDefaultAddOn } from "@/lib/pricing/boarding-default-addons";

/**
 * Replace a boarding service's default add-ons with `defaults`.
 *
 * Undefined leaves them alone, which is what a PATCH that did not mention
 * them means; `[]` removes every one. Delete-then-insert, the same shape and
 * the same limit as `writeBoardingBranchPrices`: two statements, not one
 * transaction — a failed insert leaves the service with none, and the caller
 * says so rather than reporting a save.
 *
 * An RLS-refused write answers no rows and no error, so the rows are counted.
 */
export async function writeBoardingDefaultAddOns(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  serviceId: string,
  facilityId: string,
  defaults: readonly BoardingDefaultAddOn[] | undefined,
): Promise<boolean> {
  if (!defaults) return true;

  const { error: deleteError } = await supabase
    .from("boarding_service_default_addons")
    .delete()
    .eq("service_id", serviceId)
    .select("id");
  if (deleteError) return false;

  // One row per add-on and day rule: the table's own unique key. A second
  // row for the same pair is a form that said the same thing twice.
  const seen = new Set<string>();
  const rows = defaults.flatMap((d) => {
    const key = `${d.addOnId}::${d.appliesOn}`;
    if (!d.addOnId || seen.has(key)) return [];
    seen.add(key);
    return [
      {
        service_id: serviceId,
        // Derived by a trigger anyway; sent so the insert is well formed.
        facility_id: facilityId,
        addon_id: d.addOnId,
        applies_on: d.appliesOn,
        quantity_per_day: Math.max(1, Math.round(d.quantityPerDay)),
        min_nights:
          d.minNights === null ? null : Math.max(1, Math.round(d.minNights)),
      },
    ];
  });
  if (rows.length === 0) return true;

  const { data: written, error } = await supabase
    .from("boarding_service_default_addons")
    .insert(rows)
    .select("id");
  if (error) return false;
  return (written?.length ?? 0) === rows.length;
}

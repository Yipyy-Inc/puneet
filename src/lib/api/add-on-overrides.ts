import type { createServerClient } from "@/lib/supabase/server";
import type { AddOnLocationOverride } from "@/types/add-on";

/**
 * Replace one add-on's "override by business" rows.
 *
 * Not in the route file because the POST and the PATCH both need it, and a
 * Next route module may only export HTTP methods — `boarding-service-prices.ts`
 * exists for the same reason.
 *
 * REPLACED, NOT MERGED: a location taken out of the list must lose its
 * override, or it keeps charging a price the facility just removed. A row with
 * nothing to override (every field null) is not written at all.
 *
 * Reports rather than throws, like its boarding twin: `false` means "the
 * add-on is saved, its overrides are not".
 */
export async function writeAddOnOverrides(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  addOnId: string,
  facilityId: string,
  overrides: AddOnLocationOverride[] | undefined,
): Promise<boolean> {
  if (!overrides) return true;

  const { error: deleteError } = await supabase
    .from("service_add_on_location_overrides")
    .delete()
    .eq("add_on_id", addOnId)
    .select("id");
  if (deleteError) return false;

  const rows = overrides
    .filter(
      (o) => o.price !== null || o.taxable !== null || o.durationMin !== null,
    )
    .map((o) => ({
      add_on_id: addOnId,
      // Derived by a trigger from the add-on; sent so the insert is well formed.
      facility_id: facilityId,
      location_id: o.locationId,
      price: o.price === null ? null : Math.round(o.price * 100) / 100,
      taxable: o.taxable,
      duration_min: o.durationMin,
    }));
  if (rows.length === 0) return true;

  const { data: written, error } = await supabase
    .from("service_add_on_location_overrides")
    .insert(rows)
    .select("id");

  if (error) return false;
  // An RLS-refused INSERT returns no rows and no error, so count them.
  return (written?.length ?? 0) === rows.length;
}

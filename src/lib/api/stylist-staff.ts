import type { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// A stylist id → the staff row a groom is booked WITH.
//
// The board, the calendar's stylist columns and a groomer's own queue all read
// who a groom is with from `bookings.assigned_staff_id`. The screens speak in
// stylist ids — the profile's legacy id, or its uuid when it has none — so a
// booking route handed `stylistPreference` has to turn it into the staff row
// behind the profile. Both the create and the edit route do it through this.
//
// Scoped to the facility AND read through RLS: an id from somewhere else
// resolves to nobody, and nobody is written.
// ============================================================================

type Supabase = Awaited<ReturnType<typeof createServerClient>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function staffForStylist(
  supabase: Supabase,
  facilityId: string,
  stylistKey: string,
): Promise<{ staffId: string; name: string | null } | null> {
  const { data } = await supabase
    .from("grooming_stylist_profiles")
    .select("staff_id, staff:staff_id(first_name, last_name)")
    .eq("facility_id", facilityId)
    .eq(UUID.test(stylistKey) ? "id" : "legacy_id", stylistKey)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as {
    staff_id: string;
    staff: { first_name: string | null; last_name: string | null } | null;
  };
  const name =
    [row.staff?.first_name, row.staff?.last_name].filter(Boolean).join(" ") ||
    null;
  return { staffId: row.staff_id, name };
}

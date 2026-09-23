import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  DAYCARE_SERVICE_SELECT,
  rowToDaycareService,
  type DaycareService,
  type DaycareServiceRow,
} from "@/lib/api/mappers/daycare-service";

// ============================================================================
// The daycare menu, read by the server.
//
// Three callers need the same rows and must not read them three different
// ways: the re-price (`price-booking.ts`), auto-confirm, and the tax stamp.
// They run as the ADMIN client on purpose — none of them has a session, and
// two of them run for a customer whose RLS view of the menu is narrower than
// the facility's own.
//
// ── IT DOES NOT FILTER BY is_active ───────────────────────────────────────
//
// A booking already made against a service the facility has since retired
// must still re-price at what it was sold at. Filtering here would turn every
// such booking into `quote_mismatch` the moment a facility tidied its menu.
// `eligibleDaycareServices` is what filters for the MENU; this is what
// resolves a booking that already exists.
// ============================================================================

export async function loadDaycareServices(
  facilityId: string,
  locationId?: string | null,
): Promise<DaycareService[]> {
  const { data, error } = await createAdminClient()
    .from("daycare_services")
    .select(DAYCARE_SERVICE_SELECT)
    .eq("facility_id", facilityId)
    .order("display_order", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as DaycareServiceRow[]).map((row) =>
    rowToDaycareService(row, { locationId }),
  );
}

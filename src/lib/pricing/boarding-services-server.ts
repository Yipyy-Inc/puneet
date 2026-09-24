import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  BOARDING_SERVICE_SELECT,
  rowToBoardingService,
  type BoardingService,
  type BoardingServiceRow,
} from "@/lib/api/mappers/boarding-service";

// ============================================================================
// The boarding menu, read by the server.
//
// Three callers need the same rows and must not read them three different
// ways: the re-price (`price-booking.ts`), auto-confirm, and the tax stamp.
// They run as the ADMIN client on purpose — none of them has a session, and
// two of them run for a customer whose RLS view of the menu is narrower than
// the facility's own.
//
// ── IT DOES NOT FILTER BY is_active ───────────────────────────────────────
//
// A booking already made against a service the facility has since retired must
// still re-price at what it was sold at. Filtering here would turn every such
// booking into `quote_mismatch` the moment a facility tidied its menu.
// `eligibleBoardingServices` is what filters for the MENU; this is what
// resolves a booking that already exists.
//
// The daycare twin of this file says the same thing, deliberately: the two
// menus are separate tables and separate reads, and a shared loader would make
// one service's column list decide the other's.
// ============================================================================

export async function loadBoardingServices(
  facilityId: string,
  locationId?: string | null,
): Promise<BoardingService[]> {
  const { data, error } = await createAdminClient()
    .from("boarding_services")
    .select(BOARDING_SERVICE_SELECT)
    .eq("facility_id", facilityId)
    .order("display_order", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as BoardingServiceRow[]).map((row) =>
    rowToBoardingService(row, { locationId }),
  );
}

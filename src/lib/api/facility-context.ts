import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";

// ============================================================================
// The demo facility, resolved once per request.
//
// Every route needs the same three things — the facility uuid, its primary
// location and its timezone — and all three come from one row. Resolved by
// `legacy_id` rather than hardcoded, so the same code runs against any project.
//
// TEMPORARY in one specific way: the facility is fixed to legacy id "11"
// because the front end still passes `facilityId: 11` everywhere. When the app
// learns about real facility ids, this takes the id from the viewer's
// membership instead. It is NOT a security boundary either way — RLS scopes
// rows to the caller regardless of what this returns.
// ============================================================================

export const DEMO_FACILITY_LEGACY_ID = "11";

export type FacilityContext = {
  facilityId: string;
  locationId: string | null;
  timeZone: string;
};

export async function getFacilityContext(): Promise<FacilityContext | null> {
  const supabase = await createServerClient();

  const { data: facility } = await supabase
    .from("facilities")
    .select("id, timezone")
    .eq("legacy_id", DEMO_FACILITY_LEGACY_ID)
    .maybeSingle();

  if (!facility) return null;

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("facility_id", facility.id)
    .eq("is_primary", true)
    .maybeSingle();

  return {
    facilityId: facility.id,
    locationId: location?.id ?? null,
    timeZone: facility.timezone ?? DEFAULT_TIMEZONE,
  };
}

import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";

// ============================================================================
// Which facility this request is about.
//
// Every route needs the same three things — the facility uuid, its primary
// location and its timezone — and all three come from one row.
//
// ── WHAT THIS USED TO DO, AND WHY IT BLOCKED THE SECOND FACILITY ──────────
//
// It resolved `legacy_id = "11"` unconditionally, and its own comment said so:
// "TEMPORARY … when the app learns about real facility ids, this takes the id
// from the viewer's membership instead."
//
// Nothing was visibly wrong while one facility existed. But
// /dashboard/facilities/new can create a second one TODAY, and the moment it
// did, that facility's staff hit a product that does not work: RLS correctly
// scopes their READS to their own facility, so they see an empty app — and
// every WRITE gets stamped `facility_id = <the demo facility>`, which the
// insert policies then refuse because they hold no membership there.
//
// A hard block rather than corruption, which is the good version of this bug,
// and still a product that cannot be sold twice.
//
// ── THE RULE ──────────────────────────────────────────────────────────────
//
// The viewer's membership decides. That is the same answer the rest of the
// system already gives: `member_facility_ids()` scopes RLS, `viewer.memberships`
// routes the portals, and this now agrees with both instead of asserting a
// third thing.
//
// A CUSTOMER has no membership by design (viewer.ts), and a platform admin may
// have none either. Both fall back to the demo facility, which is exactly
// today's behaviour — so this change cannot regress a single-facility project,
// and the fallback is what to delete when the customer portal learns to name
// the facility it is booking at.
//
// ── NOT A SECURITY BOUNDARY, AND THAT MATTERS HERE ────────────────────────
//
// RLS scopes rows to the caller regardless of what this returns. If this
// resolved the wrong facility, a read would come back empty and a write would
// be refused — it decides which facility a request is ABOUT, not what the
// caller may touch. That is why `preferFacilityId` below can be honoured
// without checking anything: naming a facility you are not a member of buys
// you a refusal, not access.
// ============================================================================

export const DEMO_FACILITY_LEGACY_ID = "11";

export type FacilityContext = {
  facilityId: string;
  locationId: string | null;
  timeZone: string;
  /**
   * The facility's display name.
   *
   * Here because three routes were each looking it up themselves with
   * `.eq("legacy_id", "11")`, and `facilities_read` refuses that row to anyone
   * who is not a member of it. `maybeSingle()` returns null rather than
   * raising, so the lookup fell through to a hardcoded
   * "Example Pet Care Facility" and every client in a second facility's list
   * was labelled with a name belonging to nobody. Silently.
   */
  name: string;
  /**
   * The facility's legacy NUMERIC ref.
   *
   * The mock-era types (`RoomCategory.facilityId`, `FacilityRoom.facilityId`,
   * `Client.facility`) identify a facility by number or name, and the rows do
   * not carry either — they key on the uuid. So the mappers need this to build
   * a response the existing screens can read.
   *
   * It is a LABEL, never a scope: nothing filters on it. It goes when those
   * types take the uuid.
   */
  legacyRef: number | null;
};

export async function getFacilityContext(
  /**
   * The facility this particular request names, when it knows.
   *
   * Optional so the 38 existing call sites did not have to change. It exists
   * for the multi-location case: someone with memberships at several facilities
   * has no single answer, and `memberships[0]` is a guess dressed as a fact.
   * A route that knows which facility the user is looking at should say so.
   */
  preferFacilityId?: string,
): Promise<FacilityContext | null> {
  const supabase = await createServerClient();

  const viewer = await getViewer().catch(() => null);
  const memberFacilityIds = new Set(
    (viewer?.memberships ?? []).map((m) => m.facilityId),
  );

  const chosen =
    preferFacilityId && memberFacilityIds.has(preferFacilityId)
      ? preferFacilityId
      : (viewer?.memberships[0]?.facilityId ?? null);

  const query = supabase
    .from("facilities")
    .select("id, timezone, name, legacy_id");
  const { data: facility } = chosen
    ? await query.eq("id", chosen).maybeSingle()
    : await query.eq("legacy_id", DEMO_FACILITY_LEGACY_ID).maybeSingle();

  if (!facility) return null;

  const legacyRef = Number(facility.legacy_id);

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
    name: facility.name,
    legacyRef: Number.isFinite(legacyRef) ? legacyRef : null,
  };
}

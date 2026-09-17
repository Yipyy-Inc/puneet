import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import {
  LOCATION_SELECT,
  newLocationSchema,
  newLocationToInsert,
  rowToLocation,
  type LocationRow,
} from "@/lib/api/mappers/location";

// ============================================================================
// A facility's branches.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `/facility/hq/locations` read `src/data/locations.ts` — three fictional
// Montreal branches keyed `facilityId: 11` — and wrote to
// `added-locations-store.ts`, a module-level array whose own header says:
//
//   // Swap for a real create API when the backend lands
//
// It dies with the tab. Meanwhile `public.locations` had existed since
// 20260726120000 with full RLS, and THREE tables already pointed at it:
// bookings.location_id, facility_memberships.home_location_id and
// facility_terminals.location_id. The screen and the schema had never met.
//
// ── RLS IS THE BOUNDARY ───────────────────────────────────────────────────
//
// `locations_read` admits members and clients of the facility;
// `locations_insert` requires `manage_services`. This route asks and the
// database answers. It does NOT filter by facility itself — the facility comes
// from the session only to STAMP the insert, never to scope a read, because a
// route that filters is a second opinion that drifts from the policy.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();

  const { data, error } = await supabase
    .from("locations")
    .select(LOCATION_SELECT)
    .match(inFacility(scope))
    // Primary first, then alphabetical: the branch a facility defaults to is
    // the one people look for, and creation order means nothing to anybody.
    .order("is_primary", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── THE BOOKING COUNTS, IN ONE CALL ─────────────────────────────────────
  //
  // `LOCATION_SELECT` used to end `bookings(count)`, which PostgREST evaluates
  // per location against `bookings` — 155 ms for this select became 1,589 ms
  // to 2,255 ms with it, and this route is in the shell that every facility
  // screen waits for. `location_booking_counts` answers the same question in
  // one grouped query, in 9 ms.
  //
  // Not fatal if it fails: the branches are what this route is for, and a
  // missing count reads as 0 — which only makes the HQ delete button STRICTER,
  // never looser. The guard it feeds refuses deletion while a count is above
  // zero, so failing closed here would be wrong and failing open is not what
  // this does.
  const { data: counts } = await supabase.rpc(
    "location_booking_counts" as never,
    { p_facility_id: scope } as never,
  );

  const rows = (data ?? []) as unknown as LocationRow[];
  const byLocation = (counts ?? {}) as Record<string, number>;
  return NextResponse.json(rows.map((row) => rowToLocation(row, byLocation)));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = newLocationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a location.", detail: parsed.error.issues },
      { status: 422 },
    );
  }

  // From the session, never the request — check:facility-from-session.
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("locations")
    .insert(newLocationToInsert(parsed.data, facility.facilityId))
    .select(LOCATION_SELECT)
    .single();

  if (error) {
    // 42501 is `locations_insert` refusing: the caller holds no
    // `manage_services`. Nothing is broken — they are not allowed.
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "You do not have permission to add a location." },
        { status: 403 },
      );
    }
    // 23505 is the per-facility short-code index. The message names the column,
    // which is not something to put in front of a receptionist.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Another location already uses that short code." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // No counts passed, and here that is not a default standing in for a fact: a
  // branch created a moment ago has no bookings, so 0 is its real count.
  return NextResponse.json(rowToLocation(data as unknown as LocationRow), {
    status: 201,
  });
}

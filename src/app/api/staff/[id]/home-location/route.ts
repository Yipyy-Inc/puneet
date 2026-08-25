import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Which branch a staff member is based at.
//
// `facility_memberships.home_location_id` has existed since 20260726120000 —
// nullable, FK'd to `public.locations`, indexed — and nothing in the app has
// ever read or written it. It lives on the MEMBERSHIP, not on `public.staff`,
// because that is the row created when someone actually accepts their invite
// (`claim_grants_for`, 20260807120000); a hired-but-not-yet-claimed staff row
// has no membership yet and so has nowhere to hold a location. That is why
// this is its own small route rather than another field folded into
// `staffToRow`'s `details` blob: the value does not live where that mapper
// reads from, and pretending otherwise would misreport where a save landed.
// ============================================================================

export const dynamic = "force-dynamic";

async function findStaff(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  legacyId: string,
) {
  return supabase
    .from("staff")
    .select("id, facility_id, membership_id")
    .eq("legacy_id", legacyId)
    .maybeSingle();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();
  const { data: staff } = await findStaff(supabase, id);
  if (!staff) {
    return NextResponse.json(
      { error: "Staff member not found." },
      { status: 404 },
    );
  }

  if (!staff.membership_id) {
    return NextResponse.json({ homeLocationId: null, claimed: false });
  }

  const { data: membership } = await supabase
    .from("facility_memberships")
    .select("home_location_id")
    .eq("id", staff.membership_id)
    .maybeSingle();

  return NextResponse.json({
    homeLocationId: membership?.home_location_id ?? null,
    claimed: true,
  });
}

interface PatchBody {
  homeLocationId?: string | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as PatchBody | null;
  const homeLocationId =
    typeof body?.homeLocationId === "string" ? body.homeLocationId : null;

  const supabase = await createServerClient();
  const { data: staff } = await findStaff(supabase, id);
  if (!staff) {
    return NextResponse.json(
      { error: "Staff member not found." },
      { status: 404 },
    );
  }

  if (!staff.membership_id) {
    return NextResponse.json(
      { error: "This person hasn't accepted their invite yet." },
      { status: 409 },
    );
  }

  // The FK alone does not stop a UUID from another facility's location table
  // being written here — this is the check `check:facility-from-session`
  // exists to catch, done explicitly because there is no RLS on `locations`
  // that could refuse the value at the point it is used as a foreign key.
  if (homeLocationId) {
    const { data: location } = await supabase
      .from("locations")
      .select("facility_id")
      .eq("id", homeLocationId)
      .maybeSingle();
    if (!location || location.facility_id !== staff.facility_id) {
      return NextResponse.json(
        { error: "That location doesn't belong to this business." },
        { status: 422 },
      );
    }
  }

  // `memberships_update` RLS already requires `scheduling_view_all`; asked and
  // let the database answer, same as the staff PATCH route just above this
  // one in the tree — an update RLS refuses affects zero rows and reports
  // success in Postgres, so that is checked explicitly rather than trusted.
  const { data: written, error } = await supabase
    .from("facility_memberships")
    .update({ home_location_id: homeLocationId })
    .eq("id", staff.membership_id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!written || written.length === 0) {
    return NextResponse.json(
      { error: "Not allowed to set this person's location." },
      { status: 403 },
    );
  }

  return NextResponse.json({ homeLocationId, claimed: true });
}

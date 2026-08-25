import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Every staff member's home branch, in one request.
//
// `GET /api/staff/[id]/home-location` answers one person at a time -- fine
// for a profile sheet, wrong for grouping a whole roster by branch, which is
// what the HQ staff pool and the HQ overview headcount widget both need. Two
// queries rather than a PostgREST embed: `staff` has no direct FK to
// `facility_memberships` to embed through (only `membership_id`, resolved
// here the same way the single-staff route does), and a bespoke join keeps
// `STAFF_SELECT` -- shared by POST/PATCH/GET and the payroll/HR redaction
// layer -- untouched.
//
// Roster visibility, not payroll: names and branches are what a rota needs,
// same boundary `GET /api/staff`'s own header draws. No redaction here.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, legacy_id, first_name, last_name, membership_id")
    .order("legacy_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const membershipIds = staff
    .map((s) => s.membership_id)
    .filter((id): id is string => id !== null);

  const homeByMembership = new Map<string, string | null>();
  if (membershipIds.length > 0) {
    const { data: memberships, error: membershipError } = await supabase
      .from("facility_memberships")
      .select("id, home_location_id")
      .in("id", membershipIds);
    if (membershipError) {
      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 },
      );
    }
    for (const m of memberships) homeByMembership.set(m.id, m.home_location_id);
  }

  return NextResponse.json(
    staff.map((s) => ({
      staffId: s.legacy_id ?? s.id,
      name: `${s.first_name} ${s.last_name}`.trim(),
      claimed: s.membership_id !== null,
      homeLocationId: s.membership_id
        ? (homeByMembership.get(s.membership_id) ?? null)
        : null,
    })),
  );
}

import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { STAFF_SELECT, rowToStaffProfile } from "@/lib/api/mappers/staff";

// ============================================================================
// Staff at the caller's facility.
//
// RLS decides what comes back: anyone with a membership can see their
// colleagues, because rotas, calendars and handovers are unusable otherwise.
// Being able to see that a groomer exists is not the sensitive part — payroll
// and permission overrides are, and those ride along in `details`.
//
// That is a gap worth naming rather than leaving implied: this route returns
// the whole row to anyone who can read it. Splitting the sensitive tail behind
// `view_staff_performance` / `view_staff_permissions` is the follow-up, and it
// belongs here in the route, since RLS gates rows and not columns.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("staff")
    .select(STAFF_SELECT)
    .order("legacy_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.map(rowToStaffProfile));
}

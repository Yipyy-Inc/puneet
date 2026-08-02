import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { holds, myPermissions } from "@/lib/auth/permissions";
import {
  STAFF_SELECT,
  redactStaffProfile,
  rowToStaffProfile,
} from "@/lib/api/mappers/staff";

// ============================================================================
// Staff at the caller's facility.
//
// RLS decides WHICH ROWS come back: anyone with a membership can see their
// colleagues, because rotas, calendars and handovers are unusable otherwise.
// Being able to see that a groomer exists is not the sensitive part — payroll,
// HR notes, the clock-in code and the permission overrides are, and those ride
// along in `details`.
//
// RLS cannot help with that. It gates rows, not columns, so a policy that lets
// you see a colleague lets you see every column of them. Column-level access
// has to be decided above the database, which is here.
//
// The permissions used are the DATABASE's answer (`my_permissions()`), not the
// client's opinion of itself — the same map /api/permissions returns, resolved
// server-side where it can decide what leaves rather than what gets drawn.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const [{ data, error }, permissions] = await Promise.all([
    supabase.from("staff").select(STAFF_SELECT).order("legacy_id"),
    myPermissions(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const grants = {
    payroll: holds(permissions, "view_payroll"),
    permissions: holds(permissions, "view_staff_permissions"),
    hr: holds(permissions, "manage_staff"),
  };

  // Which row is the caller's own. Matched on the VERIFIED session email, the
  // same bridge lib/auth/legacy-identity.ts uses. Lowercased both sides
  // because the staff table does not constrain case and a mismatch here fails
  // in the safe direction — you would be redacted from your own record, which
  // is confusing but not a leak.
  const email = user.email?.trim().toLowerCase();

  const profiles = data.map((row) => {
    const profile = rowToStaffProfile(row);
    const isSelf =
      email != null && profile.email?.trim().toLowerCase() === email;
    return redactStaffProfile(profile, grants, isSelf);
  });

  return NextResponse.json(profiles);
}

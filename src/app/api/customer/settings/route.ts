import { NextResponse } from "next/server";

import { settingsFromRows } from "@/lib/settings/from-rows";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// GET /api/customer/settings — the settings of the facility a CUSTOMER books
// with, in the same shape as /api/facility/settings.
//
// ── WHY THIS IS NOT /api/facility/settings ────────────────────────────────
//
// That route resolves the facility with getFacilityContext(), which reads the
// caller's MEMBERSHIP — and falls back to the demo facility for a caller with
// none. The customer booking wizard read every price, surcharge, deposit rule
// and schedule through it, so a pet owner at any business was quoted the demo
// facility's rules, confidently.
//
// The facility comes through the CLIENT ROW instead, the way
// /api/customer/facility and /api/customer/yipyy-go do: read `clients` as the
// caller (RLS admits only their own) and follow facility_id. The settings are
// read as the caller too, so `facility_settings_read` answers only the domains
// in private.customer_visible_setting_domains(); every other domain comes back
// as its documented default with `configured: false` — the same answer an
// unconfigured facility gives, never another facility's value.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data: client } = await supabase
    .from("clients")
    .select("facility_id")
    // Their OWN record: a member of staff browsing the portal reads every
    // client of their facility under RLS, and must not get an arbitrary one.
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!client?.facility_id) {
    return NextResponse.json(
      { error: "You are not a client of a facility." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("facility_settings")
    .select("domain, value")
    .eq("facility_id", client.facility_id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(settingsFromRows(data ?? []));
}

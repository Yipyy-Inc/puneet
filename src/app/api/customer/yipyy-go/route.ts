import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { YIPYY_GO_OFF, yipyyGoSettingsSchema } from "@/lib/settings/yipyy-go";
import type { YipyyGoSettings } from "@/lib/settings/yipyy-go";

// ============================================================================
// The Yipyy Go setup a CUSTOMER is being asked to comply with.
//
// ── WHY THIS IS NOT /api/facility/settings ────────────────────────────────
//
// That route resolves the facility through `getFacilityContext()`, which reads
// the caller's MEMBERSHIP. A customer has none, and that function falls back to
// the DEMO facility for a caller without one — so pointing the customer portal
// at it would decide a real customer's pre-arrival form, its deadline and its
// medication fee from a different business's settings, confidently.
//
// The facility comes through the CLIENT ROW instead, exactly as
// /api/customer/facility does it: RLS scopes `clients` to the caller's own
// record, so this cannot reach a facility they have no relationship with.
// There is no id in the request to get wrong.
//
// ── AND WHY THE DOMAIN IS READABLE AT ALL ─────────────────────────────────
//
// `facility_settings_read` admits a client only to the domains in
// `private.customer_visible_setting_domains()`, which `yipyy_go_config` joined
// in 20260906120000. Every field in it is addressed AT the customer: the form
// is put in front of them, the deadline is quoted to them, the medication fee
// lands on their invoice. Submitted forms are NOT in this domain.
//
// Until then the customer portal read all of it from a fixture array in the
// bundle, so a customer saw a form a seed file had written rather than the one
// their facility had configured.
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
    .limit(1)
    .maybeSingle();

  if (!client?.facility_id) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const { data: settingRow } = await supabase
    .from("facility_settings")
    .select("value")
    .eq("facility_id", client.facility_id)
    .eq("domain", "yipyy_go_config")
    .maybeSingle();

  // Parsed rather than cast, for the same reason /api/customer/facility parses
  // the tax config: a row written by an older shape must not reach the screen
  // that renders the form. An unreadable row means "nothing is being asked",
  // which is the safe reading — the alternative is demanding a form nobody can
  // fill.
  const parsed = yipyyGoSettingsSchema.safeParse(settingRow?.value);

  const body: { config: YipyyGoSettings; configured: boolean } = {
    config: parsed.success ? parsed.data : YIPYY_GO_OFF,
    // `configured` reports whether the FACILITY has a usable row, so a screen
    // can tell "they have not set this up" from "they switched it off". A row
    // that failed to parse counts as not configured.
    configured: parsed.success,
  };

  return NextResponse.json(body);
}

import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  NO_MOBILE_APP,
  mobileAppConfigSchema,
} from "@/lib/settings/mobile-app";
import type { MobileAppConfig } from "@/lib/settings/mobile-app";

// ============================================================================
// Which app features a CUSTOMER's facility offers them.
//
// ── WHY THIS IS NOT /api/facility/settings ────────────────────────────────
//
// That route resolves the facility through `getFacilityContext()`, which reads
// the caller's MEMBERSHIP — and for a caller with none it falls back to the
// DEMO facility. A customer pointed at it gets a 200 and a different business's
// feature flags, which here would mean offering somebody a live camera feed
// their own facility does not run. /api/customer/facility carries the same
// warning about invoices, and /api/customer/yipyy-go about forms.
//
// The facility comes through the CLIENT ROW: RLS scopes `clients` to the
// caller's own record, so this cannot reach a facility they have no
// relationship with, and there is no id in the request to get wrong.
//
// ── WHAT THE CUSTOMER PORTAL ACTUALLY DOES WITH IT ────────────────────────
//
// `enableLiveCamera`, in two places — the camera page's list and the nav item
// that reaches it. Both read a bundled fixture until 2026-09-06, one that
// shipped the flag `true`, so every facility advertised a feed nobody there had
// switched on and turning it off changed nothing a customer saw.
//
// `mobile_app_config` joined `private.customer_visible_setting_domains()` in
// 20260906213414. Every field in it is published to an app store or rendered in
// an app the customer runs.
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
    .eq("domain", "mobile_app_config")
    .maybeSingle();

  // Parsed rather than cast: a row written by an older shape must not decide
  // whether somebody is offered a camera feed. An unreadable row means the
  // empty config — every feature off — which is the safe reading.
  const parsed = mobileAppConfigSchema.safeParse(settingRow?.value);

  const body: { config: MobileAppConfig; configured: boolean } = {
    config: parsed.success ? parsed.data : NO_MOBILE_APP,
    configured: parsed.success,
  };

  return NextResponse.json(body);
}

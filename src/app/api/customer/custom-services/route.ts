import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The custom services a CUSTOMER's facility offers online.
//
// Not the `custom_services` setting: that row carries the facility's own
// notes and staff rules, so it is off the customer allowlist, and this calls
// `public.offered_custom_services()` — active, online-bookable modules,
// projected to the fields the booking flow draws (20260912172123).
//
// The facility comes through the CLIENT ROW, as /api/customer/yipyy-go does:
// RLS scopes `clients` to the caller's own record, and the function checks
// again that they are a client there.
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

  const { data, error } = await supabase.rpc("offered_custom_services", {
    p_facility_id: client.facility_id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ modules: Array.isArray(data) ? data : [] });
}

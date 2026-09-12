import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Mobile grooming as a CUSTOMER's facility offers it.
//
// Not the `mobile_grooming` setting: that row carries vans (plates, a home
// address) and which groomer covers which area on which day, so it is off the
// customer allowlist. This calls `public.offered_mobile_grooming()` — whether
// van visits are offered, the arrival window, the active service areas and
// travel zones, and the postal code distance is measured from.
//
// The facility comes through the CLIENT ROW, as /api/customer/custom-services
// does: RLS scopes `clients` to the caller's own record, and the function
// checks again that they are a client there.
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

  const { data, error } = await supabase.rpc("offered_mobile_grooming", {
    p_facility_id: client.facility_id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? {});
}

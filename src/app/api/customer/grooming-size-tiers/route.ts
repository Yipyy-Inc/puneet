import { NextResponse } from "next/server";

import { parseSizeTiers } from "@/lib/grooming/size-tier";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The grooming size bands of a CUSTOMER's own facility — the bands
// `create_booking` prices by, so the wizard quotes the size the booking will
// carry (20261002122850). `grooming_config` is members-only; this goes
// through `grooming_size_tiers()`, which hands a client the bands and nothing
// else.
//
// THE FACILITY COMES THROUGH THE CLIENT ROW, as every customer route's does —
// never `getFacilityContext()`, which answers a customer with the DEMO
// facility (`check:customer-routes`).
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

  const { data, error } = await supabase.rpc("grooming_size_tiers", {
    p_facility_id: client.facility_id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ tiers: parseSizeTiers(data) });
}

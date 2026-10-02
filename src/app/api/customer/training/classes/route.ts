import { NextResponse } from "next/server";

import { parseOfferedClasses } from "@/lib/training/offered-classes";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The training classes a CUSTOMER's own facility runs, with the places left —
// the booking wizard's "Pick a class" (the client's mock, 2026-10-01).
//
// Through `offered_training_classes()` (20261002122924): a customer reads only
// their own enrolments, so a count they made was capacity minus their own
// dogs; the function counts every enrolled dog and says how many places are
// left, never who holds them. The trainer is "Alex M." where shown online.
//
// THE FACILITY COMES THROUGH THE CLIENT ROW — never `getFacilityContext()`,
// which answers a customer with the DEMO facility (`check:customer-routes`).
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

  const { data, error } = await supabase.rpc("offered_training_classes", {
    p_facility_id: client.facility_id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(parseOfferedClasses(data));
}

import { NextResponse, type NextRequest } from "next/server";

import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import { evaluationAvailability } from "@/lib/evaluations/availability-server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// When a CUSTOMER can book an evaluation — each start and the places left
// at it, over `days` from `from` (the client's mock, 2026-10-02).
//
// A customer cannot read other people's bookings or the staff's hours, and
// must not: so this reads them with the service role and hands back starts,
// counts and — only when the facility lets clients choose — evaluators as
// "Sarah J.". Never a booking, a client or a reason. The facility's notice
// and how far ahead it books are applied here, from its own settings, not
// taken from the request.
//
// THE FACILITY COMES THROUGH THE CLIENT ROW, under the caller's own RLS —
// never `getFacilityContext()`, which answers a customer with the DEMO
// facility (`check:customer-routes`).
//
//   ?from=YYYY-MM-DD&days=21&pets=1
// ============================================================================

export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const { data: client } = await supabase
    .from("clients")
    .select("facility_id")
    .match(inFacility(scope))
    .limit(1)
    .maybeSingle();
  if (!client?.facility_id) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const params = request.nextUrl.searchParams;
  const from = params.get("from") ?? "";
  const days = Number(params.get("days") ?? 21);
  const pets = Number(params.get("pets") ?? 1);
  if (!DAY.test(from)) {
    return NextResponse.json({ error: "A day is needed." }, { status: 422 });
  }
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "Online times are not available right now." },
      { status: 503 },
    );
  }

  const availability = await evaluationAvailability(createAdminClient(), {
    facilityId: client.facility_id,
    from,
    days: Number.isFinite(days) ? days : 21,
    pets: Number.isFinite(pets) && pets > 0 ? Math.floor(pets) : 1,
    forCustomer: true,
  });
  return NextResponse.json(availability);
}

import { NextResponse, type NextRequest } from "next/server";

import { trainingAvailability } from "@/lib/training/availability-server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// When a CUSTOMER can book a private lesson or a consult of `minutes` — open
// start times, per trainer, over `days` from `from` (the client's mock,
// 2026-10-01).
//
// A customer cannot read the trainers' hours, their time off or their other
// appointments, and must not: so this reads them with the service role and
// hands back START TIMES ONLY — never a busy interval, a client, a booking or
// a reason. Trainer names are "Alex M.", and only for the trainers the
// facility shows online; the rest are a time without a name.
//
// THE FACILITY COMES THROUGH THE CLIENT ROW, under the caller's own RLS —
// never `getFacilityContext()`, which answers a customer with the DEMO
// facility (`check:customer-routes`) — and only then is the service role
// asked about that one facility.
//
//   ?from=YYYY-MM-DD&days=14&minutes=60[&notice=24]
// ============================================================================

export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  // The facility is the caller's own client row's. For a customer the scope
  // is null and this reads through RLS, as the menus do; a member of staff is
  // held to the facility they are working in (check:facility-scoped-reads).
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
  const minutes = Number(params.get("minutes"));
  const days = Number(params.get("days") ?? 14);
  const notice = Number(params.get("notice") ?? 0);
  if (!DAY.test(from) || !(minutes > 0) || minutes > 24 * 60) {
    return NextResponse.json(
      { error: "A day and a length are needed." },
      { status: 422 },
    );
  }
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "Online times are not available right now." },
      { status: 503 },
    );
  }

  const availability = await trainingAvailability(createAdminClient(), {
    facilityId: client.facility_id,
    from,
    days: Number.isFinite(days) ? days : 14,
    minutes,
    forCustomer: true,
    noticeHours: Number.isFinite(notice) ? notice : 0,
  });
  return NextResponse.json(availability);
}

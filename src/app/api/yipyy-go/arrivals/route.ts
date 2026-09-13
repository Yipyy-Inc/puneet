import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import {
  rowToYipyyGoArrival,
  type YipyyGoArrivalRow,
} from "@/lib/api/mappers/yipyy-go";
import { yipyyGoFailure } from "@/lib/yipyy-go/route-helpers";

// ============================================================================
// /api/yipyy-go/arrivals — who is arriving today, for the check-in kiosk.
//
// GET  ?q= a client's or a dog's name, or a booking number. The facility on
//      screen (activeFacilityIdForStaff → p_facility_id), on its own
//      calendar, through yipyy_go_arrivals() — SECURITY INVOKER, so the
//      bookings policy decides what the desk may see.
//
// It replaces a search over src/data/bookings pinned to fixture facility 11.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scope = await activeFacilityIdForStaff();
  if (!scope) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("yipyy_go_arrivals", {
    p_facility_id: scope,
    ...(q ? { p_query: q } : {}),
  });
  if (error) return yipyyGoFailure(error);

  return NextResponse.json(
    ((data ?? []) as unknown as YipyyGoArrivalRow[]).map(rowToYipyyGoArrival),
  );
}

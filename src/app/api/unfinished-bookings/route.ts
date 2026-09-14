import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import {
  UNFINISHED_BOOKING_SELECT,
  rowToUnfinishedBooking,
  type UnfinishedBookingRow,
} from "@/lib/api/mappers/unfinished-booking";

// ============================================================================
// The facility's unfinished bookings — what customers started and left.
//
// Staff with view_bookings read them (RLS). Scoped to the session's active
// facility, because RLS alone would merge every facility a platform admin can
// see (check:facility-scoped-reads). Newest first; a long tail of old
// abandonments is not a to-do list, so the last 500.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scope = await activeFacilityIdForStaff();
  if (!scope) return NextResponse.json([]);

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("unfinished_bookings")
    .select(UNFINISHED_BOOKING_SELECT)
    .match(inFacility(scope))
    .order("abandoned_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    ((data ?? []) as unknown as UnfinishedBookingRow[]).map(
      rowToUnfinishedBooking,
    ),
  );
}

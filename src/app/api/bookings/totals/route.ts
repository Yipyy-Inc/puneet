import { NextResponse, type NextRequest } from "next/server";

import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import { ownStaffId } from "@/lib/api/own-staff";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The bookings page's tiles: all, today, upcoming, pending, and revenue.
//
// `public.booking_facility_totals` (the_bookings_page_totals_are_one_query),
// counted in the table's own scope: the facility on screen, optionally one
// location, optionally the bookings assigned to the viewer. They were added
// up in the browser over every booking the facility ever had.
// ============================================================================

export const dynamic = "force-dynamic";

export interface BookingTotals {
  total: number;
  today: number;
  upcoming: number;
  pending: number;
  paidRevenue: number;
  pendingRevenue: number;
}

const ZERO: BookingTotals = {
  total: 0,
  today: 0,
  upcoming: 0,
  pending: 0,
  paidRevenue: 0,
  pendingRevenue: 0,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scope = await activeFacilityIdForStaff();
  if (!scope) return NextResponse.json(ZERO);

  const search = new URL(request.url).searchParams;
  const locationId = search.get("locationId");
  const supabase = await createServerClient();

  let staffId: string | null = null;
  if (search.get("assigned") === "1") {
    staffId = (await ownStaffId(supabase, viewer, scope)) ?? null;
    if (!staffId) return NextResponse.json(ZERO);
  }

  const { data, error } = await supabase.rpc(
    "booking_facility_totals" as never,
    {
      p_facility_id: scope,
      p_location_id: locationId && UUID.test(locationId) ? locationId : null,
      p_staff_id: staffId,
    } as never,
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (
    (data ?? []) as unknown as {
      total: number;
      today: number;
      upcoming: number;
      pending: number;
      paid_revenue: number | string;
      pending_revenue: number | string;
    }[]
  )[0];
  if (!row) return NextResponse.json(ZERO);

  const totals: BookingTotals = {
    total: row.total,
    today: row.today,
    upcoming: row.upcoming,
    pending: row.pending,
    paidRevenue: Number(row.paid_revenue),
    pendingRevenue: Number(row.pending_revenue),
  };
  return NextResponse.json(totals);
}

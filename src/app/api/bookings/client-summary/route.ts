import { NextResponse } from "next/server";

import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import type { BookingClientSummary } from "@/lib/api/booking-client-summary";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// What the facility's booking history says about each client.
//
// `public.booking_client_summary` (20260914 a_client_booking_summary_is_one_
// query): a count, the first and last day, the services used, whether one is
// still open, and whether they came back within 60 days. The screens that
// loaded every booking to learn those facts read this instead.
//
// Staff only, for the facility on screen (activeFacilityIdForStaff): RLS
// inside the function decides what the caller may read. A customer has no
// active facility and gets an empty list.
// ============================================================================

export const dynamic = "force-dynamic";

type Row = {
  client_ref: number;
  booking_count: number;
  first_day: string;
  last_day: string;
  services: string[] | null;
  has_active: boolean;
  rebooked_within_60_days: boolean;
};

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scope = await activeFacilityIdForStaff();
  if (!scope) return NextResponse.json([]);

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc(
    "booking_client_summary" as never,
    { p_facility_id: scope } as never,
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary: BookingClientSummary[] = (
    (data ?? []) as unknown as Row[]
  ).map((row) => ({
    clientRef: Number(row.client_ref),
    bookingCount: row.booking_count,
    firstDay: row.first_day,
    lastDay: row.last_day,
    services: row.services ?? [],
    hasActive: row.has_active,
    rebookedWithin60Days: row.rebooked_within_60_days,
  }));
  return NextResponse.json(summary);
}

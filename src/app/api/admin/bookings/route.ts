import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { bookingRefCandidates } from "@/lib/booking-id";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// GET /api/admin/bookings?q=<number> — find a booking by its number, in any
// facility, for Yipyy's own team.
//
// A facility calls support about "booking #10896"; nothing in the admin
// portal could find it. The number may be the displayed form (#10896) or the
// ref a URL carries (896) — bookingRefCandidates offers both, and every match
// comes back with its facility so the two can never be confused.
//
// Platform members only. The read is the caller's own, under bookings_read,
// which admits a platform member to every facility's bookings: this route
// decides nothing the database does not.
// ============================================================================

export const dynamic = "force-dynamic";

export interface AdminBookingMatch {
  ref: number;
  facilityId: string;
  facilityName: string;
  clientName: string | null;
  service: string;
  status: string;
  startAt: string;
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only Yipyy's team may look up any facility's bookings." },
      { status: 403 },
    );
  }

  const refs = bookingRefCandidates(
    request.nextUrl.searchParams.get("q") ?? "",
  );
  if (refs.length === 0) return NextResponse.json([]);

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "ref, facility_id, service, status, start_at, facilities ( name ), clients ( name )",
    )
    .in("ref", refs)
    .limit(10);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Array<{
    ref: number;
    facility_id: string;
    service: string;
    status: string;
    start_at: string;
    facilities: { name: string } | null;
    clients: { name: string | null } | null;
  }>;
  // The candidates' own order: the displayed form first.
  rows.sort((a, b) => refs.indexOf(a.ref) - refs.indexOf(b.ref));
  return NextResponse.json(
    rows.map(
      (r): AdminBookingMatch => ({
        ref: r.ref,
        facilityId: r.facility_id,
        facilityName: r.facilities?.name ?? "",
        clientName: r.clients?.name ?? null,
        service: r.service,
        status: r.status,
        startAt: r.start_at,
      }),
    ),
  );
}

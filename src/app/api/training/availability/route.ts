import { NextResponse, type NextRequest } from "next/server";

import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import { trainingAvailability } from "@/lib/training/availability-server";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// When each trainer can take a private lesson or a consult of `minutes`, over
// `days` from `from` — the staff booking wizard's "Trainer & time" (the mock,
// 2026-10-01). Read through the member's own session: RLS decides what they
// may see, and ONE facility is asked about, the one they are working in.
//
//   ?from=YYYY-MM-DD&days=14&minutes=60[&exclude=<booking uuid>,…]
// ============================================================================

export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const scope = await activeFacilityIdForStaff();
  if (!scope) {
    return NextResponse.json({ error: "No facility." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const from = params.get("from") ?? "";
  const minutes = Number(params.get("minutes"));
  const days = Number(params.get("days") ?? 14);
  if (!DAY.test(from) || !(minutes > 0) || minutes > 24 * 60) {
    return NextResponse.json(
      { error: "A day and a length are needed." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const availability = await trainingAvailability(supabase, {
    facilityId: scope,
    from,
    days: Number.isFinite(days) ? days : 14,
    minutes,
    forCustomer: false,
    excludeBookingIds: (params.get("exclude") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  });
  return NextResponse.json(availability);
}

import { NextResponse, type NextRequest } from "next/server";

import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import { evaluationAvailability } from "@/lib/evaluations/availability-server";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// When an evaluation can start, over `days` from `from` — the staff booking
// wizard's "Pick a date & time" (the client's mock, 2026-10-02): each start's
// places left and which evaluators are free for it. Read through the member's
// own session, for the ONE facility they are working in.
//
//   ?from=YYYY-MM-DD&days=21&pets=2[&exclude=<booking uuid>,…]
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
  const days = Number(params.get("days") ?? 21);
  const pets = Number(params.get("pets") ?? 1);
  if (!DAY.test(from)) {
    return NextResponse.json({ error: "A day is needed." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const availability = await evaluationAvailability(supabase, {
    facilityId: scope,
    from,
    days: Number.isFinite(days) ? days : 21,
    pets: Number.isFinite(pets) && pets > 0 ? Math.floor(pets) : 1,
    forCustomer: false,
    excludeBookingIds: (params.get("exclude") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  });
  return NextResponse.json(availability);
}

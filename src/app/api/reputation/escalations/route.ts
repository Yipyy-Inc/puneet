import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The recovery queue.
//
// ── OPEN FIRST, OLDEST FIRST, BREACHED AT THE TOP ─────────────────────────
//
// Ordered by `first_response_due_at` ascending rather than by when the
// complaint arrived, so the ticket closest to breaching — or furthest past it —
// is the one somebody sees. A queue ordered by arrival puts the ticket you have
// already missed at the bottom, which is how one stayed open from 27 April.
//
// ── THE BREACH IS DERIVED, NOT STORED ─────────────────────────────────────
//
// `first_response_due_at < now()` is the whole test, and it is computed at
// read time. A stored `is_breached` flag would need something to set it, that
// something would be a job, and a job that stops running would quietly turn
// every breach into an on-time ticket. `breach_notified_at` is different and IS
// stored, because "did we already shout about this" is a fact about an action
// we took rather than about the clock.
// ============================================================================

export const dynamic = "force-dynamic";

const SELECT = `
  id, state, service_type, assignee_ids, opened_at,
  first_response_due_at, acknowledged_at, resolve_due_at, resolved_at,
  resolution_code, resolution_note, breach_notified_at,
  response:review_responses!inner(
    id, rating, comment, source, submitted_at,
    staff:staff(id, first_name, last_name),
    request:review_requests!inner(
      id, business_day, service_types,
      client:clients!inner(id, ref, name, email, phone)
    )
  ),
  events:review_escalation_events!left(
    id, kind, actor, payload, occurred_at
  )
`;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!holds(await myPermissions(), "marketing_manage_reviews")) {
    return NextResponse.json(
      { error: "You do not have permission to see recovery tickets." },
      { status: 403 },
    );
  }

  const facility = await getFacilityContext().catch(() => null);
  if (!facility) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const scope = request.nextUrl.searchParams.get("scope") ?? "open";

  let query = supabase
    .from("review_escalations")
    .select(SELECT)
    .eq("facility_id", facility.facilityId)
    .order("first_response_due_at", { ascending: true })
    .limit(100);

  query =
    scope === "resolved"
      ? query.in("state", ["resolved", "closed"])
      : query.in("state", ["open", "acknowledged", "in_recovery"]);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ escalations: data ?? [] });
}

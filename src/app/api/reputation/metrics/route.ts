import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The reputation numbers, for the screens that show them.
//
// ── THE PERMISSION IS CHECKED HERE, AND THAT IS NEW ───────────────────────
//
// `marketing_manage_reviews` has been a real, seeded permission since the
// module was built, gating the nav item — and NO SERVER CODE HAS EVER CHECKED
// IT. The module was fixtures, so there was no server code to check it in. A
// nav-only gate is exactly the shape `check:rls-writes` and the
// `server-permissions` spec exist to catch, so every route added here checks it
// explicitly.
//
// ── AND THE FACILITY COMES FROM THE SESSION ───────────────────────────────
//
// Never from the query string. `check:facility-from-session` enforces it, and
// the reason is that these functions are `security invoker`: they would happily
// answer about a facility the caller can see, and the caller must not get to
// nominate which one.
//
// The RLS on `review_requests` is still the boundary — this route could omit
// every check above and return nothing for a stranger. The checks are here so
// that a member of staff without the permission gets a 403 rather than an
// empty screen they cannot tell from a quiet month.
// ============================================================================

export const dynamic = "force-dynamic";

/** The widest range the UI offers, so a typo cannot ask for ten years. */
const MAX_DAYS = 400;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!holds(await myPermissions(), "marketing_manage_reviews")) {
    return NextResponse.json(
      { error: "You do not have permission to see review analytics." },
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

  const params = request.nextUrl.searchParams;
  const to = params.get("to") ?? today();
  const from = params.get("from") ?? daysBefore(to, 30);

  if (!isDate(from) || !isDate(to) || from > to) {
    return NextResponse.json(
      { error: "That is not a date range." },
      { status: 422 },
    );
  }
  if (daysBetween(from, to) > MAX_DAYS) {
    return NextResponse.json(
      { error: `Ranges are limited to ${MAX_DAYS} days.` },
      { status: 422 },
    );
  }

  // Empty means every location the caller can see, never "no locations" — the
  // same rule the dispatcher follows, and for the same reason: an empty array
  // meaning none would blank every card the moment somebody cleared the last
  // chip on the scope selector.
  const locationIds = params.getAll("location").filter(Boolean);
  const scope = locationIds.length > 0 ? locationIds : null;

  const supabase = await createServerClient();

  const [metrics, staff, services] = await Promise.all([
    supabase.rpc("reputation_metrics", {
      p_facility_id: facility.facilityId,
      p_from: from,
      p_to: to,
      ...(scope ? { p_location_ids: scope } : {}),
    }),
    supabase.rpc("reputation_staff_stats", {
      p_facility_id: facility.facilityId,
      p_from: from,
      p_to: to,
      ...(scope ? { p_location_ids: scope } : {}),
    }),
    supabase.rpc("reputation_service_stats", {
      p_facility_id: facility.facilityId,
      p_from: from,
      p_to: to,
      ...(scope ? { p_location_ids: scope } : {}),
    }),
  ]);

  const failure = metrics.error ?? staff.error ?? services.error;
  if (failure) {
    return NextResponse.json({ error: failure.message }, { status: 500 });
  }

  return NextResponse.json({
    metrics: metrics.data,
    staff: staff.data ?? [],
    services: services.data ?? [],
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBefore(date: string, days: number): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() - days);
  return at.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      86_400_000,
  );
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

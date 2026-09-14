import { NextResponse, type NextRequest } from "next/server";

import { enrichBookingRows } from "@/lib/api/booking-enrich";
import { shiftDay } from "@/lib/api/booking-list-params";
import {
  BOOKING_PAGE_SORTS,
  likePattern,
  normalizeBookingPageParams,
} from "@/lib/api/booking-page-params";
import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import { BOOKING_SELECT } from "@/lib/api/mappers/booking";
import { ownStaffId } from "@/lib/api/own-staff";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TIMEZONE,
  instantFromWallClock,
  wallClockParts,
} from "@/lib/time/facility-time";

// ============================================================================
// One page of the facility's bookings, searched, filtered and sorted here.
//
// The bookings page loaded every booking the facility ever had and did all of
// that in the browser. On the e2e facility's 1,000+ rows that was seven view
// reads per call and failed under load. It asks for fifteen at a time now,
// with the total, and the tiles come from /api/bookings/totals.
//
// ── SCOPE ─────────────────────────────────────────────────────────────────
//
// The facility on screen (activeFacilityIdForStaff), then RLS. A location, and
// "assigned to me" for a viewer whose view_bookings is assigned_only, narrow
// it further — the same narrowing the page applied, applied before the count.
//
// ── DAYS ARE THE FACILITY'S ───────────────────────────────────────────────
//
// "Today" and the date range are facility-local days, turned into instants on
// the facility's own clock, so a 19:00 drop-off in Montreal is not tomorrow's.
// ============================================================================

export const dynamic = "force-dynamic";

const EMPTY = { bookings: [], total: 0 };

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scope = await activeFacilityIdForStaff();
  if (!scope) return NextResponse.json(EMPTY);

  const params = normalizeBookingPageParams(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  const supabase = await createServerClient();

  const { data: facility } = await supabase
    .from("facilities")
    .select("timezone")
    .eq("id", scope)
    .maybeSingle();
  const zone =
    (facility as { timezone: string | null } | null)?.timezone ??
    DEFAULT_TIMEZONE;
  const dayStart = (day: string) => instantFromWallClock(day, "00:00", zone);

  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT, { count: "exact" })
    .match(inFacility(scope));

  if (params.locationId) query = query.eq("location_id", params.locationId);

  if (params.assigned) {
    const staffId = await ownStaffId(supabase, viewer, scope);
    if (!staffId) return NextResponse.json(EMPTY);
    query = query.eq("assigned_staff_id", staffId);
  }

  if (params.status) query = query.eq("status", params.status as never);
  if (params.service) query = query.eq("service", params.service as never);
  if (params.paymentStatus) {
    query = query.eq("payment_status", params.paymentStatus as never);
  }

  if (params.tagId) {
    const { data: tagged, error: tagError } = await supabase
      .from("facility_tag_assignments")
      .select("entity_id")
      .eq("facility_id", scope)
      .eq("tag_id", params.tagId)
      .eq("entity_type", "booking")
      .limit(1000);
    if (tagError) {
      return NextResponse.json({ error: tagError.message }, { status: 500 });
    }
    const ids = ((tagged ?? []) as { entity_id: string }[]).map(
      (row) => row.entity_id,
    );
    if (ids.length === 0) return NextResponse.json(EMPTY);
    query = query.in("id", ids);
  }

  if (params.q) {
    query = /^#?\d+$/.test(params.q)
      ? query.eq("ref", Number(params.q.replace("#", "")))
      : query.ilike("clients.name", likePattern(params.q));
  }

  if (params.view === "today") {
    const today = wallClockParts(new Date().toISOString(), zone).date;
    query = query
      .gte("start_at", dayStart(today))
      .lt("start_at", dayStart(shiftDay(today, 1)));
  }

  if (params.from) {
    const to = params.to ?? params.from;
    query = query
      .lt("start_at", dayStart(shiftDay(to, 1)))
      .gte("end_at", dayStart(params.from));
  }

  const column = params.sort ? BOOKING_PAGE_SORTS[params.sort] : "start_at";
  query = query.order(column, { ascending: params.dir === "asc" });
  if (column !== "start_at") {
    query = query.order("start_at", { ascending: false });
  }

  const offset = (params.page - 1) * params.pageSize;
  const { data, error, count } = await query.range(
    offset,
    offset + params.pageSize - 1,
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const enriched = await enrichBookingRows(supabase, data ?? []);
  if (!enriched.ok) {
    return NextResponse.json({ error: enriched.error }, { status: 500 });
  }
  return NextResponse.json({ bookings: enriched.bookings, total: count ?? 0 });
}

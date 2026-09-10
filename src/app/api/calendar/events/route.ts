import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";
import {
  CALENDAR_EVENT_SELECT,
  manualEventToColumns,
  rowToManualEvent,
  type CalendarEventRow,
} from "@/lib/api/mappers/calendar-event";
import type { ManualFacilityEvent } from "@/lib/operations-calendar";

// ============================================================================
// The facility calendar's own events and block time.
//
// They lived in localStorage under a key with a hard-coded facility id of 11
// (20260910223523 says why that could not stand). RLS decides who reads — any
// member, a private event only its author — and who writes
// (manage_booking_calendar); this route adds the facility's time zone, which
// the calendar's wall-clock strings need on the way in and out.
//
// Deleted events come back for 30 days, because the calendar offers to
// recover them; after that they are not read.
// ============================================================================

export const dynamic = "force-dynamic";

const RECOVERABLE_DAYS = 30;
const HISTORY_DAYS = 400;

async function facilityTimeZone(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  facilityId: string,
): Promise<string> {
  const { data } = await supabase
    .from("facilities")
    .select("timezone")
    .eq("id", facilityId)
    .maybeSingle();
  return (
    (data as { timezone: string | null } | null)?.timezone ?? DEFAULT_TIMEZONE
  );
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scope = await activeFacilityIdForStaff();
  if (!scope) return NextResponse.json([]);

  const supabase = await createServerClient();
  const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString();
  const recoverable = new Date(
    Date.now() - RECOVERABLE_DAYS * 86_400_000,
  ).toISOString();

  const { data, error } = await supabase
    .from("calendar_events")
    .select(CALENDAR_EVENT_SELECT)
    .match(inFacility(scope))
    .gte("ends_at", since)
    .or(`deleted_at.is.null,deleted_at.gte.${recoverable}`)
    .order("starts_at", { ascending: true })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const timeZone = await facilityTimeZone(supabase, scope);
  return NextResponse.json(
    ((data ?? []) as unknown as CalendarEventRow[]).map((row) =>
      rowToManualEvent(row, timeZone),
    ),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    event?: ManualFacilityEvent;
  } | null;
  const event = body?.event;
  if (!event?.title?.trim() || !event.start || !event.end) {
    return NextResponse.json(
      { error: "An event needs a title, a start and an end." },
      { status: 422 },
    );
  }

  // From the session, never the request — check:facility-from-session.
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const timeZone = await facilityTimeZone(supabase, facility.facilityId);
  const viewer = await getViewer().catch(() => null);

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      facility_id: facility.facilityId,
      ...manualEventToColumns(event, timeZone),
      // "Internal only" on a custom event is the author's own.
      private_to: event.visibility === "internal-only" ? user.id : null,
      created_by_name: viewer?.fullName ?? viewer?.email ?? null,
    })
    .select(CALENDAR_EVENT_SELECT)
    .single();

  if (error) {
    if (error.code === "23514") {
      return NextResponse.json(
        { error: "An event cannot end before it starts." },
        { status: 422 },
      );
    }
    return writeFailure(error, {
      duplicate: "That event already exists.",
      denied: "You do not have permission to change this calendar.",
    });
  }

  return NextResponse.json(
    rowToManualEvent(data as unknown as CalendarEventRow, timeZone),
    { status: 201 },
  );
}

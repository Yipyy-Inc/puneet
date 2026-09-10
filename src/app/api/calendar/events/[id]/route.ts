import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";
import {
  CALENDAR_EVENT_SELECT,
  manualEventToColumns,
  rowToManualEvent,
  type CalendarEventRow,
} from "@/lib/api/mappers/calendar-event";
import type { ManualFacilityEvent } from "@/lib/operations-calendar";
import type { TablesUpdate } from "@/types/database";

// ============================================================================
// Editing, moving, deleting and recovering one calendar event.
//
// `deleted: true` stamps `deleted_at`; `deleted: false` clears it. There is no
// DELETE: the calendar offers 30 days to recover, and the table grants no
// delete to anybody signed in (20260910223523).
//
// The write ends in `.select()` so an RLS refusal — zero rows, not an error —
// is a 403 (check:rls-writes).
// ============================================================================

export const dynamic = "force-dynamic";

const DENIED = "You do not have permission to change this calendar.";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    event?: ManualFacilityEvent;
    deleted?: boolean;
  } | null;
  if (!body || (body.event === undefined && body.deleted === undefined)) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }
  if (body.event && (!body.event.title?.trim() || !body.event.start)) {
    return NextResponse.json(
      { error: "An event needs a title, a start and an end." },
      { status: 422 },
    );
  }

  const facility = await getFacilityContext();
  const supabase = await createServerClient();
  const { data: tz } = facility
    ? await supabase
        .from("facilities")
        .select("timezone")
        .eq("id", facility.facilityId)
        .maybeSingle()
    : { data: null };
  const timeZone =
    (tz as { timezone: string | null } | null)?.timezone ?? DEFAULT_TIMEZONE;

  const update: TablesUpdate<"calendar_events"> = {};
  if (body.event)
    Object.assign(update, manualEventToColumns(body.event, timeZone));
  if (body.deleted !== undefined) {
    update.deleted_at = body.deleted ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .update(update)
    .eq("id", id)
    .select(CALENDAR_EVENT_SELECT);

  if (error) {
    if (error.code === "23514") {
      return NextResponse.json(
        { error: "An event cannot end before it starts." },
        { status: 422 },
      );
    }
    return writeFailure(error, { duplicate: DENIED, denied: DENIED });
  }
  const denied = deniedIfUntouched(data, DENIED);
  if (denied) return denied;

  return NextResponse.json(
    rowToManualEvent((data as unknown as CalendarEventRow[])[0], timeZone),
  );
}

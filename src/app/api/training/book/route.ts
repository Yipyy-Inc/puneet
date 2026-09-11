import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";
import {
  buildTrainingBook,
  type BookEnrollmentRow,
  type BookSeriesRow,
  type BookSessionRow,
} from "@/lib/api/mappers/training-book";

// ============================================================================
// The facility's training book — its classes, their dates and who is
// enrolled — in the shapes the calendar, session view, students list and
// make-ups draw (see src/lib/api/mappers/training-book.ts).
//
// Those screens read `@/data/training`, so a real facility's calendar showed
// four invented trainers teaching classes nobody had created, and a series
// created on the Series tab never appeared on it.
//
// RLS decides who may read a series (view_training_queue or
// training_manage_programs); every read is also narrowed to the facility on
// screen, because RLS alone would merge every facility a platform admin can
// see.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();

  const { data: seriesData, error } = await supabase
    .from("training_series")
    .select(
      `id, name, course_type_name, staff_id, day_of_week, start_time,
       duration_minutes, start_date, number_of_sessions, capacity,
       total_price, status, locations(name),
       staff(legacy_id, first_name, last_name)`,
    )
    .match(inFacility(scope))
    .order("start_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const series = (seriesData ?? []) as unknown as BookSeriesRow[];
  if (series.length === 0) {
    return NextResponse.json({ classes: [], sessions: [], enrollments: [] });
  }
  const seriesIds = series.map((s) => s.id);

  const [sessionsResult, enrollmentsResult, bookingsResult, facilityResult] =
    await Promise.all([
      supabase
        .from("training_series_sessions")
        .select("id, series_id, session_number, start_at, end_at, status")
        .match(inFacility(scope))
        .in("series_id", seriesIds)
        .order("start_at", { ascending: true }),
      supabase
        .from("training_series_enrollments")
        .select(
          `id, series_id, status, enrolled_at,
           pets(ref, name, breed), clients(ref, name, phone, email)`,
        )
        .match(inFacility(scope))
        .in("series_id", seriesIds),
      // What each dog has actually attended: its session bookings that were
      // checked in (training_attendance, 20260806980000).
      supabase
        .from("bookings")
        .select(
          `training_series_session_id,
           booking_pets(pets(ref)),
           training_attendance(checked_in_at)`,
        )
        .match(inFacility(scope))
        .eq("service", "training")
        .not("training_series_session_id", "is", null),
      scope
        ? supabase
            .from("facilities")
            .select("timezone")
            .eq("id", scope)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const sessions = (sessionsResult.data ?? []) as unknown as BookSessionRow[];
  const enrollments = (enrollmentsResult.data ??
    []) as unknown as BookEnrollmentRow[];

  const seriesOfSession = new Map(sessions.map((s) => [s.id, s.series_id]));
  const attended = new Map<string, Map<number, number>>();
  for (const row of (bookingsResult.data ?? []) as unknown as {
    training_series_session_id: string | null;
    booking_pets: { pets: { ref: number } | null }[] | null;
    training_attendance:
      | { checked_in_at: string | null }
      | { checked_in_at: string | null }[]
      | null;
  }[]) {
    const seriesId = row.training_series_session_id
      ? seriesOfSession.get(row.training_series_session_id)
      : undefined;
    if (!seriesId) continue;
    const attendance = Array.isArray(row.training_attendance)
      ? row.training_attendance[0]
      : row.training_attendance;
    if (!attendance?.checked_in_at) continue;
    const bySeries = attended.get(seriesId) ?? new Map<number, number>();
    for (const bp of row.booking_pets ?? []) {
      if (!bp.pets) continue;
      bySeries.set(bp.pets.ref, (bySeries.get(bp.pets.ref) ?? 0) + 1);
    }
    attended.set(seriesId, bySeries);
  }

  const timeZone =
    (facilityResult.data as { timezone: string | null } | null)?.timezone ??
    DEFAULT_TIMEZONE;

  return NextResponse.json(
    buildTrainingBook({ series, sessions, enrollments, attended, timeZone }),
  );
}

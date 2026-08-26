import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import type {
  RealTrainingSeries,
  RealTrainingSeriesSession,
} from "@/types/training-series";

export const dynamic = "force-dynamic";

const SERIES_SELECT = `
  id, facility_id, location_id, staff_id, name, course_type_name,
  day_of_week, start_time, duration_minutes, start_date, number_of_sessions,
  capacity, total_price, status, created_at, updated_at,
  locations(name), staff(first_name, last_name)
`;

interface SeriesRow {
  id: string;
  facility_id: string;
  location_id: string | null;
  staff_id: string | null;
  name: string;
  course_type_name: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  start_date: string;
  number_of_sessions: number;
  capacity: number;
  total_price: number;
  status: RealTrainingSeries["status"];
  created_at: string;
  updated_at: string;
  locations: { name: string } | null;
  staff: { first_name: string; last_name: string } | null;
}

interface SessionRow {
  id: string;
  series_id: string;
  session_number: number;
  start_at: string;
  end_at: string;
  status: RealTrainingSeriesSession["status"];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const supabase = await createServerClient();

  const { data: seriesRow, error } = await supabase
    .from("training_series")
    .select(SERIES_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!seriesRow) {
    return NextResponse.json({ error: "No such series." }, { status: 404 });
  }

  const row = seriesRow as unknown as SeriesRow;

  const { data: sessionRows } = await supabase
    .from("training_series_sessions")
    .select("id, series_id, session_number, start_at, end_at, status")
    .eq("series_id", id)
    .order("session_number", { ascending: true });

  const { data: enrollmentRows } = await supabase
    .from("training_series_enrollments")
    .select("status")
    .eq("series_id", id);

  const counts = (enrollmentRows ?? []).reduce(
    (acc, r) => {
      const status = (r as { status: string }).status;
      if (status === "enrolled") acc.enrolled += 1;
      if (status === "waitlisted") acc.waitlisted += 1;
      return acc;
    },
    { enrolled: 0, waitlisted: 0 },
  );

  const series: RealTrainingSeries = {
    id: row.id,
    facilityId: row.facility_id,
    locationId: row.location_id,
    locationName: row.locations?.name ?? null,
    staffId: row.staff_id,
    staffName: row.staff
      ? `${row.staff.first_name} ${row.staff.last_name}`.trim()
      : null,
    name: row.name,
    courseTypeName: row.course_type_name,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    startDate: row.start_date,
    numberOfSessions: row.number_of_sessions,
    capacity: row.capacity,
    totalPrice: row.total_price,
    status: row.status,
    enrolledCount: counts.enrolled,
    waitlistedCount: counts.waitlisted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  const sessions: RealTrainingSeriesSession[] = (
    (sessionRows ?? []) as SessionRow[]
  ).map((s) => ({
    id: s.id,
    seriesId: s.series_id,
    sessionNumber: s.session_number,
    startAt: s.start_at,
    endAt: s.end_at,
    status: s.status,
  }));

  return NextResponse.json({ series, sessions });
}

/**
 * Cancelling a series, not deleting it -- `training_series` has a DELETE
 * grant (it is a facility's own row and nothing references it the way a
 * booking references payments), but a series with real enrollments and real
 * bookings against it should read as "cancelled", not vanish and leave those
 * rows pointing at nothing sensible on screen. Enrollments and their
 * still-upcoming bookings are withdrawn the same way a person withdrawing
 * would be -- through withdraw_from_training_series(), one per enrollment.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const supabase = await createServerClient();

  const { data: enrollments } = await supabase
    .from("training_series_enrollments")
    .select("id")
    .eq("series_id", id)
    .in("status", ["enrolled", "waitlisted"]);

  for (const enrollment of (enrollments ?? []) as { id: string }[]) {
    await supabase.rpc("withdraw_from_training_series", {
      p_enrollment_id: enrollment.id,
    });
  }

  const { error } = await supabase
    .from("training_series")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to cancel training classes at this facility.",
      duplicate: "",
    });
  }

  return NextResponse.json({ ok: true });
}

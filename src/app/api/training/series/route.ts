import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import type {
  CreateTrainingSeriesInput,
  RealTrainingSeries,
} from "@/types/training-series";

// ============================================================================
// Real training classes.
//
// A series is created through create_training_series() (20260826110000),
// which materializes every one of its sessions in the same transaction, in
// the facility's (or the series' own branch's) timezone. There is no PATCH
// for the schedule here -- it is immutable after creation; see the migration
// header for why regenerating it safely is out of scope for now.
//
// RLS decides visibility: staff with view_training_queue/
// training_manage_programs see everything at their facility, a customer sees
// only status='active' series at a facility they belong to. This route does
// not filter by facility itself -- exactly like GET /api/bookings, the read
// is unscoped and RLS supplies the right rows for whoever is asking.
// ============================================================================

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

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("training_series")
    .select(SERIES_SELECT)
    .order("start_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as SeriesRow[];
  const ids = rows.map((r) => r.id);

  // One extra query for the enrollment counts every card/table needs, rather
  // than N -- same reasoning as the reports' single-pass aggregates.
  const counts = new Map<string, { enrolled: number; waitlisted: number }>();
  if (ids.length > 0) {
    const { data: enrollmentRows } = await supabase
      .from("training_series_enrollments")
      .select("series_id, status")
      .in("series_id", ids);
    for (const row of (enrollmentRows ?? []) as {
      series_id: string;
      status: string;
    }[]) {
      const bucket = counts.get(row.series_id) ?? {
        enrolled: 0,
        waitlisted: 0,
      };
      if (row.status === "enrolled") bucket.enrolled += 1;
      if (row.status === "waitlisted") bucket.waitlisted += 1;
      counts.set(row.series_id, bucket);
    }
  }

  return NextResponse.json(rows.map((row) => toApi(row, counts)));
}

function toApi(
  row: SeriesRow,
  counts: Map<string, { enrolled: number; waitlisted: number }>,
): RealTrainingSeries {
  const bucket = counts.get(row.id) ?? { enrolled: 0, waitlisted: 0 };
  return {
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
    enrolledCount: bucket.enrolled,
    waitlistedCount: bucket.waitlisted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validate(input: CreateTrainingSeriesInput): string | null {
  if (!input.name?.trim()) return "A series needs a name.";
  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    return "That is not a day of the week.";
  }
  if (!input.startTime) return "A series needs a start time.";
  if (!input.durationMinutes || input.durationMinutes <= 0) {
    return "Session duration must be positive.";
  }
  if (!input.startDate) return "A series needs a start date.";
  if (!input.numberOfSessions || input.numberOfSessions <= 0) {
    return "A series needs at least one session.";
  }
  if (input.capacity < 0) return "Capacity cannot be negative.";
  if (input.totalPrice < 0) return "Price cannot be negative.";
  return null;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request
    .json()
    .catch(() => null)) as CreateTrainingSeriesInput | null;
  if (!input) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }
  const problem = validate(input);
  if (problem) return NextResponse.json({ error: problem }, { status: 422 });

  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("create_training_series", {
    p_facility_id: facility.facilityId,
    p_name: input.name.trim(),
    p_day_of_week: input.dayOfWeek,
    p_start_time: input.startTime,
    p_duration_minutes: input.durationMinutes,
    p_start_date: input.startDate,
    p_number_of_sessions: input.numberOfSessions,
    p_capacity: input.capacity,
    p_total_price: input.totalPrice,
    p_location_id: input.locationId ?? undefined,
    p_staff_id: input.staffId ?? undefined,
    p_course_type_name: input.courseTypeName ?? "",
  });

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to create training classes at this facility.",
      duplicate: "A series like that already exists.",
    });
  }

  return NextResponse.json(
    { id: (data as { id: string }).id },
    { status: 201 },
  );
}

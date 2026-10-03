import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// GET /api/bookings/[ref]/training — the class a training booking belongs to,
// for the booking page's Program, Sessions and Skills cards (the client's
// Booking_Details mock, 2026-10-03).
//
// A training booking is ONE session of a series (`enroll_in_training_series`
// makes a booking per session), and the booking row only knows its session.
// The page needs the series around it: the program, its trainer and branch,
// every session in order, and — for THIS dog — which sessions it attended and
// how each exercise was rated. That is four tables, so it is read here once
// rather than assembled by the browser from four routes.
//
// Read with the caller's own client: RLS decides what a viewer may see, and a
// booking they may not see is a 404, as everywhere else. A private lesson
// (no series) answers `series: null`.
// ============================================================================

export const dynamic = "force-dynamic";

export interface BookingTrainingSession {
  id: string;
  number: number;
  startAt: string;
  endAt: string;
  status: "scheduled" | "completed" | "cancelled";
  /** This dog's booking for that session, when it has one. */
  bookingRef: number | null;
  /** This dog's attendance at it, when recorded. */
  attendance: {
    checkedInAt: string | null;
    checkedOutAt: string | null;
    mark: string | null;
    exercises: { exerciseName: string; rating: number }[];
  } | null;
}

export interface BookingTraining {
  series: {
    id: string;
    name: string;
    courseTypeName: string;
    numberOfSessions: number;
    trainerName: string | null;
    locationName: string | null;
  } | null;
  currentSessionId: string | null;
  sessions: BookingTrainingSession[];
}

type Attendance = {
  checked_in_at: string | null;
  checked_out_at: string | null;
  mark: string | null;
  exercises: unknown;
};

/** PostgREST answers a one-to-one embed as an object or a one-row array. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function ratings(value: unknown): { exerciseName: string; rating: number }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const { exerciseName, rating } = (item ?? {}) as Record<string, unknown>;
    return typeof exerciseName === "string" && typeof rating === "number"
      ? [{ exerciseName, rating }]
      : [];
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const bookingRef = Number((await params).ref);
  if (!Number.isFinite(bookingRef)) {
    return NextResponse.json({ error: "Invalid booking id." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: bookingRow } = await supabase
    .from("bookings")
    .select(
      "id, facility_id, service, training_series_session_id, booking_pets ( pet_id )",
    )
    .eq("ref", bookingRef)
    .maybeSingle();
  const booking = bookingRow as unknown as {
    id: string;
    facility_id: string;
    service: string;
    training_series_session_id: string | null;
    booking_pets: { pet_id: string }[] | null;
  } | null;
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const none: BookingTraining = {
    series: null,
    currentSessionId: null,
    sessions: [],
  };
  if (booking.service !== "training" || !booking.training_series_session_id) {
    return NextResponse.json(none);
  }

  const { data: sessionRow } = await supabase
    .from("training_series_sessions")
    .select("id, series_id")
    .eq("id", booking.training_series_session_id)
    .maybeSingle();
  const current = sessionRow as { id: string; series_id: string } | null;
  if (!current) return NextResponse.json(none);

  const [{ data: seriesRow }, { data: sessionRows }] = await Promise.all([
    supabase
      .from("training_series")
      .select(
        "id, name, course_type_name, number_of_sessions, locations ( name ), staff ( first_name, last_name )",
      )
      .eq("id", current.series_id)
      .maybeSingle(),
    supabase
      .from("training_series_sessions")
      .select("id, session_number, start_at, end_at, status")
      .eq("series_id", current.series_id)
      // The booking's own facility, not whatever RLS lets this viewer see.
      .eq("facility_id", booking.facility_id)
      .order("session_number", { ascending: true }),
  ]);
  const series = seriesRow as unknown as {
    id: string;
    name: string;
    course_type_name: string;
    number_of_sessions: number;
    locations: { name: string } | { name: string }[] | null;
    staff:
      | { first_name: string | null; last_name: string | null }
      | { first_name: string | null; last_name: string | null }[]
      | null;
  } | null;
  if (!series) return NextResponse.json(none);
  const sessions = (sessionRows ?? []) as {
    id: string;
    session_number: number;
    start_at: string;
    end_at: string;
    status: BookingTrainingSession["status"];
  }[];

  // This dog's bookings across the series, with what it did at each.
  const petId = booking.booking_pets?.[0]?.pet_id ?? null;
  const attended = new Map<
    string,
    { ref: number; attendance: Attendance | null }
  >();
  if (petId && sessions.length > 0) {
    const { data: petBookings } = await supabase
      .from("bookings")
      .select(
        "ref, status, training_series_session_id, booking_pets!inner ( pet_id ), training_attendance ( checked_in_at, checked_out_at, mark, exercises )",
      )
      .in(
        "training_series_session_id",
        sessions.map((s) => s.id),
      )
      .eq("booking_pets.pet_id", petId)
      .eq("facility_id", booking.facility_id)
      .neq("status", "cancelled");
    for (const row of (petBookings ?? []) as unknown as {
      ref: number;
      training_series_session_id: string;
      training_attendance: Attendance | Attendance[] | null;
    }[]) {
      attended.set(row.training_series_session_id, {
        ref: row.ref,
        attendance: one(row.training_attendance),
      });
    }
  }

  const trainer = one(series.staff);
  const answer: BookingTraining = {
    series: {
      id: series.id,
      name: series.name,
      courseTypeName: series.course_type_name,
      numberOfSessions: series.number_of_sessions,
      trainerName: trainer
        ? [trainer.first_name, trainer.last_name].filter(Boolean).join(" ") ||
          null
        : null,
      locationName: one(series.locations)?.name ?? null,
    },
    currentSessionId: current.id,
    sessions: sessions.map((s) => {
      const mine = attended.get(s.id);
      const a = mine?.attendance ?? null;
      return {
        id: s.id,
        number: s.session_number,
        startAt: s.start_at,
        endAt: s.end_at,
        status: s.status,
        bookingRef: mine?.ref ?? null,
        attendance: a
          ? {
              checkedInAt: a.checked_in_at,
              checkedOutAt: a.checked_out_at,
              mark: a.mark,
              exercises: ratings(a.exercises),
            }
          : null,
      };
    }),
  };
  return NextResponse.json(answer);
}

import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import {
  TRAINING_BOOKING_SELECT,
  rowToTrainingAttendee,
  type TrainingBookingRow,
} from "@/lib/api/mappers/training-attendance";

// ============================================================================
// Today's training sessions, and who turned up.
//
// The board read `trainingSessions` and `enrollments` — two module arrays —
// through `useUnifiedBookings`. Checking a dog into a class flipped a status in
// `useState` and was gone when the tab closed.
//
// ── A DAY, LIKE DAYCARE ───────────────────────────────────────────────────
//
// A training session begins and ends inside one day, so the query is "which
// training bookings START today", left-joined to their attendance. A booking
// with no attendance row is `scheduled`: booked and not yet arrived.
//
// Boarding needed a second query for the guest who is still here on Tuesday
// after a Sunday departure; a class does not run over, so there is none.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const url = new URL(request.url);
  const date =
    url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("bookings")
    .select(TRAINING_BOOKING_SELECT)
    .eq("service", "training")
    .not("status", "in", "(cancelled,declined,no_show)")
    .gte("start_at", `${date}T00:00:00.000Z`)
    .lte("start_at", `${date}T23:59:59.999Z`)
    .order("start_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const attendees = ((data ?? []) as unknown as TrainingBookingRow[])
    .map(rowToTrainingAttendee)
    .filter((a): a is NonNullable<typeof a> => a !== null);

  return NextResponse.json({ date, attendees });
}

interface CheckInInput {
  bookingRef?: number;
  notes?: string;
}

/**
 * A dog arrives for its class.
 *
 * Idempotent on the booking: pressing it twice is somebody making sure, not the
 * dog arriving again, and the arrival time does not move.
 *
 * An UPSERT, which this project usually refuses — the two halves fail
 * differently under RLS, so a row-count check on one looks like a guard and
 * catches nothing (20260806640000). It is safe here for the reason that note
 * gave: both policies are the SAME permission (`check_in_out`), so whoever can
 * insert can update and the update path cannot be the refused one. If those
 * policies ever diverge this has to become two statements.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CheckInInput | null;
  if (!Number.isFinite(body?.bookingRef)) {
    return NextResponse.json(
      { error: "Which booking is arriving?" },
      { status: 422 },
    );
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, service")
    .eq("ref", body!.bookingRef!)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json(
      { error: "That booking does not exist, or is not yours." },
      { status: 404 },
    );
  }
  if ((booking as { service: string }).service !== "training") {
    return NextResponse.json(
      { error: "That booking is not a training booking." },
      { status: 422 },
    );
  }

  const bookingId = (booking as { id: string }).id;
  const { data: existing } = await supabase
    .from("training_attendance")
    .select("booking_id, checked_in_at")
    .eq("booking_id", bookingId)
    .maybeSingle();

  const { error } = await supabase.from("training_attendance").upsert(
    {
      booking_id: bookingId,
      facility_id: context.facilityId,
      checked_in_at:
        (existing as { checked_in_at: string | null } | null)?.checked_in_at ??
        new Date().toISOString(),
      ...(body!.notes !== undefined ? { session_notes: body!.notes } : {}),
    } as never,
    { onConflict: "booking_id" },
  );

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to check dogs in at this facility.",
      duplicate: "That dog is already checked in.",
    });
  }

  return NextResponse.json({ bookingRef: body!.bookingRef }, { status: 201 });
}

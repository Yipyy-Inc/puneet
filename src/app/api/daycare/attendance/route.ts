import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import {
  DAYCARE_BOOKING_SELECT,
  rowToDaycareCheckIn,
  type DaycareBookingRow,
  type PetSizeTier,
} from "@/lib/api/mappers/daycare";

// ============================================================================
// Who is on the daycare floor today.
//
// The board read `daycareCheckIns` — a module array whose arrivals are dated
// March 2024 — into `useState`, so a check-in survived until the tab was
// closed and the screen showed dogs collected two and a half years ago.
//
// ── A DAY, NOT A LIST ─────────────────────────────────────────────────────
//
// The query is "which daycare bookings cover this date", left-joined to their
// attendance. A booking with no attendance row is `scheduled` — booked and not
// yet arrived — which is a state the fixture could not represent at all: it had
// no row until somebody checked in.
//
// ── CAPACITY COMES BACK WITH IT ───────────────────────────────────────────
//
// The floor's limits are configuration (`daycare_config`), not a count of
// anything, so they are read rather than derived. What IS derived is how full
// the floor is — that is the caller's sum over the rows below, and no column
// stores it.
// ============================================================================

export const dynamic = "force-dynamic";

interface DaycareConfigRow {
  capacity_total: number;
  capacity_by_size: Record<string, number>;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const url = new URL(request.url);

  // The facility's day, taken as a whole. A visit that started this morning is
  // on today's board whatever time it is now.
  const date =
    url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const { data: bookingRows, error: bookingError } = await supabase
    .from("bookings")
    .select(DAYCARE_BOOKING_SELECT)
    .eq("service", "daycare")
    .not("status", "in", "(cancelled,declined)")
    .gte("start_at", dayStart)
    .lte("start_at", dayEnd)
    .order("start_at", { ascending: true });

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  // The FACILITY's size policy, which lives in grooming_config despite the
  // name — one weight→size answer for the whole business. See the mapper.
  const { data: groomingConfig } = await supabase
    .from("grooming_config")
    .select("pet_size_tiers")
    .maybeSingle();

  const tiers = (groomingConfig?.pet_size_tiers ??
    []) as unknown as PetSizeTier[];

  const visits = ((bookingRows ?? []) as unknown as DaycareBookingRow[])
    .map((row) => rowToDaycareCheckIn(row, tiers))
    .filter((v): v is NonNullable<typeof v> => v !== null);

  const { data: configRow } = await supabase
    .from("daycare_config")
    .select("capacity_total, capacity_by_size")
    .maybeSingle();

  const config = (configRow ?? null) as DaycareConfigRow | null;

  return NextResponse.json({
    date,
    visits,
    capacity: {
      total: config?.capacity_total ?? 0,
      bySize: config?.capacity_by_size ?? {},
    },
  });
}

interface CheckInInput {
  bookingRef?: number;
  rateType?: string;
  playGroup?: string;
  notes?: string;
}

/**
 * Check a dog in.
 *
 * Upserts the attendance row and stamps `checked_in_at`. Idempotent on the
 * booking — pressing it twice does not create a second visit, and does not move
 * the arrival time either: the first press is when the dog actually arrived.
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
  if ((booking as { service: string }).service !== "daycare") {
    // Named rather than accepted: `daycare_attendance` would hold it happily,
    // and a boarding stay appearing on the daycare floor is the kind of thing
    // discovered by a headcount that will not reconcile.
    return NextResponse.json(
      { error: "That booking is not a daycare booking." },
      { status: 422 },
    );
  }

  const bookingId = (booking as { id: string }).id;

  const { data: existing } = await supabase
    .from("daycare_attendance")
    .select("booking_id, checked_in_at")
    .eq("booking_id", bookingId)
    .maybeSingle();

  const row = {
    booking_id: bookingId,
    facility_id: context.facilityId,
    // Only on the FIRST check-in. A second press is somebody making sure, not
    // the dog arriving again.
    checked_in_at:
      (existing as { checked_in_at: string | null } | null)?.checked_in_at ??
      new Date().toISOString(),
    ...(body!.rateType ? { rate_type: body!.rateType } : {}),
    ...(body!.playGroup !== undefined ? { play_group: body!.playGroup } : {}),
    ...(body!.notes !== undefined ? { notes: body!.notes } : {}),
  };

  // AN UPSERT, WHICH THIS PROJECT USUALLY REFUSES. 20260806640000 rewrote
  // `assign_boarding_room` as explicit branches because under RLS the two
  // halves fail differently — an INSERT refused by `with check` RAISES, an
  // UPDATE refused by `using` matches nothing and reports success — so a
  // row-count check on an upsert looks like a guard and catches nothing.
  //
  // That argument does not apply here, and the reason is the condition the note
  // gave: both policies are the SAME permission (`daycare_check_in_out`).
  // Whoever can insert can update, so the update path cannot be the refused
  // one. If those policies ever diverge, this has to become two statements.
  const { error } = await supabase
    .from("daycare_attendance")
    .upsert(row as never, { onConflict: "booking_id" });

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to check dogs in at this facility.",
      duplicate: "That dog is already checked in.",
    });
  }

  return NextResponse.json({ bookingRef: body!.bookingRef }, { status: 201 });
}

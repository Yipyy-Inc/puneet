import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { recordArrival } from "@/lib/api/boarding-arrival-write";
import {
  BOARDING_ARRIVAL_SELECT,
  BOARDING_ON_SITE_SELECT,
  rowToBoardingArrival,
  type BoardingArrivalRow,
} from "@/lib/api/mappers/boarding-arrival";

// ============================================================================
// Who is arriving, who is here, and who should have gone home.
//
// ── A BOARDING DAY IS NOT A DAYCARE DAY ───────────────────────────────────
//
// The daycare board asks "which bookings START today", because a daycare visit
// begins and ends inside one day. A boarding guest is here for a week: the
// board has to show the bookings that OVERLAP today, which is a different
// query, and then one more on top of it.
//
// THE SECOND QUERY IS THE POINT. A guest who was due out on Sunday and is still
// in kennel 4 on Tuesday overlaps neither today's arrivals nor today's
// departures, and is exactly what an arrivals board exists to surface. So
// anyone checked in and not checked out is pulled in regardless of dates, and
// `isOverdue` says so.
//
// It also does not exclude cancelled bookings, deliberately, for the same
// reason the status ordering puts the dog first (20260806900000): a booking
// cancelled while its dog is in the building is still a dog in the building.
// Cancelled bookings that were never checked in do drop out, via the first
// query.
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
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  // Booked across this day: arriving, staying, or leaving.
  const { data: overlapping, error: overlapError } = await supabase
    .from("bookings")
    .select(BOARDING_ARRIVAL_SELECT)
    .eq("service", "boarding")
    .not("status", "in", "(cancelled,declined)")
    .lte("start_at", dayEnd)
    .gte("end_at", dayStart)
    .order("start_at", { ascending: true });

  if (overlapError) {
    return NextResponse.json({ error: overlapError.message }, { status: 500 });
  }

  // Physically on site, whatever the dates say.
  const { data: onSite, error: onSiteError } = await supabase
    .from("bookings")
    .select(BOARDING_ON_SITE_SELECT)
    .eq("service", "boarding")
    .not("boarding_stays.checked_in_at", "is", null)
    .is("boarding_stays.checked_out_at", null);

  if (onSiteError) {
    return NextResponse.json({ error: onSiteError.message }, { status: 500 });
  }

  const byRef = new Map<number, BoardingArrivalRow>();
  for (const row of [
    ...((overlapping ?? []) as unknown as BoardingArrivalRow[]),
    ...((onSite ?? []) as unknown as BoardingArrivalRow[]),
  ]) {
    byRef.set(row.ref, row);
  }

  const guests = [...byRef.values()]
    .map((row) => rowToBoardingArrival(row, date))
    .sort((a, b) => a.scheduledArrival.localeCompare(b.scheduledArrival));

  return NextResponse.json({ date, guests });
}

interface CheckInInput {
  bookingRef?: number;
}

/**
 * A guest arrives.
 *
 * All the work is in `record_boarding_arrival` (20260806920000), and it has to
 * be: the arrival is an UPDATE on `boarding_stays`, whose policies ask for
 * `edit_bookings` — which `boarding_attendant`, the role that meets guests at
 * the door, does not hold. Written from here the update matched no rows and
 * reported success.
 *
 * Stamping the STAY also means a guest with no kennel cannot be checked in.
 * That is the rule and not an oversight (20260806900000): you cannot take a dog
 * in and put it nowhere. The 409 names the screen that fixes it.
 *
 * Pressing it twice does not move the arrival time. The first press is when the
 * dog was actually standing at the desk.
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

  const response = await recordArrival(body!.bookingRef!, "check_in");
  if (!response.ok) return response;

  return NextResponse.json({ bookingRef: body!.bookingRef }, { status: 201 });
}

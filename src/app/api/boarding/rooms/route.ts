import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  BOARDING_ROOM_SELECT,
  rowToBoardingRoom,
  rowToOccupancy,
  type BoardingRoomRow,
  type BoardingStayRow,
} from "@/lib/api/mappers/boarding";

// ============================================================================
// The facility's kennels, and who is in them.
//
// Replaces `BOARDING_ROOMS` in src/data/boarding-ops.ts, which the assignment
// board read directly. The rooms are now the same rows the exclusion
// constraint judges (20260806600000) -- so a board that says a kennel is free
// and a POST that answers 409 can no longer disagree.
//
// ── THE OCCUPANCY IS DERIVED, AND SO IS THE CAPACITY ──────────────────────
//
// Nothing here stores an occupancy count. The response is the rooms and the
// stays overlapping the window asked about; totals, percentages and per-type
// breakdowns are the caller's to compute from those.
//
// That matters because the fixture this replaces had THREE disagreeing
// vocabularies for one idea:
//
//   BOARDING_ROOMS      6 rooms, types standard / deluxe / vip / cat-suite
//   boardingCapacity    total 30, keyed standard / premium / luxury
//   BoardingGuest       packageType "Standard Kennel" / "Premium Suite" / ...
//
// none of which join. The boarding page read "X of 30 kennels" from the
// middle one while the assignment board offered six rooms from the first.
// Rooms are the only operational truth -- you assign an animal to one -- so
// they are what the count comes from now.
//
// ── SCOPED BY RLS ─────────────────────────────────────────────────────────
//
// `boarding_rooms_read` admits any active member of the facility, mirroring
// `staff_read`: the person doing the kennel round needs the kennel list, and
// gating it on `view_services` would hide the board from the people standing
// at it (the mistake 20260806540000 corrected for stylists).
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const url = new URL(request.url);

  // Default window is "right now": the board's usual question is which kennels
  // are occupied at this moment. A booking flow asks about its own dates.
  const from = url.searchParams.get("from") ?? new Date().toISOString();
  const to = url.searchParams.get("to") ?? from;

  const { data: roomRows, error: roomError } = await supabase
    .from("boarding_rooms")
    .select(BOARDING_ROOM_SELECT)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }

  const rows = (roomRows ?? []) as unknown as BoardingRoomRow[];
  const rooms = rows.map(rowToBoardingRoom);
  const roomIdByUuid = new Map(
    rows.map((row) => [row.id, row.legacy_id ?? row.id]),
  );

  // Overlap, not containment: a stay that started before this window and runs
  // through it still occupies the kennel. `to > from AND from < to` is the
  // half-open overlap the constraint itself uses.
  //
  // A zero-width window (the default, where from === to) would match nothing
  // under a strict comparison, so the instant is nudged to a range of itself
  // and the bounds do the rest.
  const windowEnd = to === from ? from : to;
  const { data: stayRows, error: stayError } = await supabase
    .from("boarding_stays")
    .select(
      "booking_id, room_id, occupies, override_reason, bookings(ref, status)",
    )
    .is("released_at", null)
    .overlaps("occupies", `[${from},${windowEnd}]`);

  if (stayError) {
    return NextResponse.json({ error: stayError.message }, { status: 500 });
  }

  const occupied = ((stayRows ?? []) as unknown as BoardingStayRow[])
    .map((row) => rowToOccupancy(row, roomIdByUuid))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return NextResponse.json({ rooms, occupied });
}

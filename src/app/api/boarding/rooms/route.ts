import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { DEMO_FACILITY_LEGACY_ID } from "@/lib/api/facility-context";
import {
  ROOM_CATEGORY_SELECT,
  FACILITY_ROOM_SELECT,
  rowToRoomCategory,
  rowToFacilityRoom,
  rowToOccupancy,
  BOARDING_STAY_SELECT,
  type RoomCategoryRow,
  type FacilityRoomRow,
  type BoardingStayRow,
} from "@/lib/api/mappers/boarding";

// ============================================================================
// The facility's rooms, their categories, and who is in them.
//
// Serves `RoomCategory[]` and `FacilityRoom[]` — the types the Rooms admin
// screen already uses — so the page a manager edits rooms on and the path a
// booking takes now describe a room the same way. Before 20260806660000 they
// were disjoint models: 29 units in localStorage that no booking could reach,
// and 6 rows in Postgres that nothing could edit.
//
// ── THE OCCUPANCY IS DERIVED ──────────────────────────────────────────────
//
// Nothing stores an occupancy count. The response is the rooms and the stays
// overlapping the window asked about; totals, percentages and per-category
// breakdowns are the caller's to compute. Capacity is likewise derived —
// `facility_rooms.capacity` when set, otherwise the category's default, which
// is why it is NULL rather than a copy.
//
// ── SCOPED BY RLS ─────────────────────────────────────────────────────────
//
// `facility_rooms_read` admits any active member of the facility: the person
// doing the kennel round needs the kennel list, and gating it on a management
// permission would hide the board from the people standing at it (the mistake
// 20260806540000 corrected for stylists).
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  // `RoomCategory.facilityId` and `FacilityRoom.facilityId` are the app's
  // NUMERIC ref, which these rows do not carry — they key on the uuid. Every
  // row RLS returns belongs to the caller's facility, so the ref is a constant
  // here for the same reason the rest of the app still passes `facilityId: 11`.
  const facilityRef = Number(DEMO_FACILITY_LEGACY_ID);
  const url = new URL(request.url);

  // Default window is "right now": the board's usual question is which rooms
  // are occupied at this moment. A booking flow asks about its own dates.
  const from = url.searchParams.get("from") ?? new Date().toISOString();
  const to = url.searchParams.get("to") ?? from;

  const { data: categoryRows, error: categoryError } = await supabase
    .from("room_categories")
    .select(ROOM_CATEGORY_SELECT)
    .order("sort_order", { ascending: true });

  if (categoryError) {
    return NextResponse.json({ error: categoryError.message }, { status: 500 });
  }

  const catRows = (categoryRows ?? []) as unknown as RoomCategoryRow[];
  const categories = catRows.map((row) => rowToRoomCategory(row, facilityRef));
  const categoryIdByUuid = new Map(
    catRows.map((row) => [row.id, row.legacy_id ?? row.id]),
  );

  const { data: roomRows, error: roomError } = await supabase
    .from("facility_rooms")
    .select(FACILITY_ROOM_SELECT)
    .order("sort_order", { ascending: true });

  if (roomError) {
    return NextResponse.json({ error: roomError.message }, { status: 500 });
  }

  const rows = (roomRows ?? []) as unknown as FacilityRoomRow[];
  const rooms = rows.map((row) =>
    rowToFacilityRoom(row, facilityRef, categoryIdByUuid),
  );
  const roomIdByUuid = new Map(
    rows.map((row) => [row.id, row.legacy_id ?? row.id]),
  );

  // Overlap, not containment: a stay that started before this window and runs
  // through it still occupies the room. A zero-width window (the default,
  // where from === to) would match nothing under a strict comparison, so the
  // instant is used as both bounds and the range operator does the rest.
  const windowEnd = to === from ? from : to;
  const { data: stayRows, error: stayError } = await supabase
    .from("boarding_stays")
    .select(BOARDING_STAY_SELECT)
    .is("released_at", null)
    .overlaps("occupies", `[${from},${windowEnd}]`);

  if (stayError) {
    return NextResponse.json({ error: stayError.message }, { status: 500 });
  }

  const occupied = ((stayRows ?? []) as unknown as BoardingStayRow[])
    .map((row) => rowToOccupancy(row, roomIdByUuid))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return NextResponse.json({ categories, rooms, occupied });
}

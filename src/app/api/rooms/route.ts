import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { DEMO_FACILITY_LEGACY_ID } from "@/lib/api/facility-context";
import {
  ROOM_CATEGORY_SELECT,
  FACILITY_ROOM_SELECT,
  rowToRoomCategory,
  rowToFacilityRoom,
  type RoomCategoryRow,
  type FacilityRoomRow,
} from "@/lib/api/mappers/boarding";

// ============================================================================
// The room catalogue: every category and every unit, across services.
//
// The Rooms admin page reads this. `/api/boarding/rooms` answers a different
// question — which rooms are FREE across a window — and joins the stays to do
// it. Both read the same two tables, which is the point: before 20260806660000
// the page edited a localStorage copy that no booking could reach.
//
// No `service` filter here. The page groups by service itself, and a catalogue
// that silently returned only boarding would make a daycare category look like
// it had failed to save.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const facilityRef = Number(DEMO_FACILITY_LEGACY_ID);

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

  const rooms = ((roomRows ?? []) as unknown as FacilityRoomRow[]).map((row) =>
    rowToFacilityRoom(row, facilityRef, categoryIdByUuid),
  );

  return NextResponse.json({ categories, rooms });
}

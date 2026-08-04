import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import type { FacilityRoom } from "@/types/rooms";

// ============================================================================
// Editing and removing one room.
//
// ── A ROOM WITH A GUEST IN IT CANNOT BE REMOVED ───────────────────────────
//
// `boarding_stays.room_id` is ON DELETE RESTRICT (20260806600000), so a room
// with any stay against it — live, released or historical — refuses to be
// deleted. That is the correct answer: deleting it would erase where an animal
// actually slept.
//
// Deactivating is the operation the facility usually wants ("out for a deep
// clean"), and it is a PATCH. The delete's message says so, because the raw
// foreign-key violation names a constraint and nothing a person can act on.
// ============================================================================

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const input = (await request
    .json()
    .catch(() => null)) as Partial<FacilityRoom> | null;
  if (!input) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }
  if (input.name !== undefined && !input.name.trim()) {
    return NextResponse.json(
      { error: "A room needs a name." },
      { status: 422 },
    );
  }
  if (
    input.capacity !== undefined &&
    input.capacity !== null &&
    input.capacity < 1
  ) {
    return NextResponse.json(
      { error: "Capacity must be at least 1." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.active !== undefined) patch.active = input.active;
  // `null` is meaningful: it clears the override and hands capacity back to
  // the category. Only an ABSENT key leaves it alone.
  if (input.capacity !== undefined) patch.capacity = input.capacity ?? null;
  if (input.staffNotes !== undefined)
    patch.staff_notes = input.staffNotes ?? null;
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl ?? null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("facility_rooms")
    .update(patch as never)
    .eq("legacy_id", id)
    .select("legacy_id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage rooms at this facility.",
      duplicate: "A room with that name already exists in this category.",
    });
  }

  const denied = deniedIfUntouched(data, "Not allowed to change this room.");
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}

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

  const { data: room } = await supabase
    .from("facility_rooms")
    .select("id")
    .eq("legacy_id", id)
    .maybeSingle();

  if (!room) {
    return NextResponse.json({ error: "No such room." }, { status: 404 });
  }

  const { count } = await supabase
    .from("boarding_stays")
    .select("booking_id", { count: "exact", head: true })
    .eq("room_id", room.id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "This room has stays recorded against it and cannot be removed. Deactivate it instead.",
      },
      { status: 409 },
    );
  }

  const { data: removed, error } = await supabase
    .from("facility_rooms")
    .delete()
    .eq("legacy_id", id)
    .select("legacy_id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage rooms at this facility.",
      duplicate: "That room cannot be removed.",
    });
  }

  const denied = deniedIfUntouched(removed, "Not allowed to remove this room.");
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}

import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import type { RoomCategory } from "@/types/rooms";

// ============================================================================
// Editing and removing a room category.
//
// ── DELETING A CATEGORY DOES NOT DELETE ITS ROOMS ─────────────────────────
//
// The localStorage version this replaces removed the category AND every unit
// in it, silently. `facility_rooms.category_id` is ON DELETE RESTRICT
// (20260806660000) precisely so that cannot happen: a category with rooms in it
// is a wing of the building, and one of those rooms may have a guest in it
// tonight — `boarding_stays.room_id` is RESTRICT too, so the delete would fail
// halfway through in the old model's shape.
//
// So this refuses, and says how many rooms are in the way. Emptying the
// category first is a decision a person should make one room at a time.
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
    .catch(() => null)) as Partial<RoomCategory> | null;
  if (!input) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }
  if (input.name !== undefined && !input.name.trim()) {
    return NextResponse.json(
      { error: "A category needs a name." },
      { status: 422 },
    );
  }
  if (input.defaultCapacity !== undefined && input.defaultCapacity < 1) {
    return NextResponse.json(
      { error: "Capacity must be at least 1." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  // Only what was sent. A full mapping would blank every column the caller
  // left out, which is what makes PATCH different from PUT.
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined)
    patch.description = input.description ?? null;
  if (input.color !== undefined) patch.color = input.color;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
  if (input.defaultCapacity !== undefined)
    patch.default_capacity = input.defaultCapacity;
  if (input.defaultBasePrice !== undefined) {
    patch.default_base_price = input.defaultBasePrice ?? null;
  }
  if (input.visibleToClients !== undefined) {
    patch.visible_to_clients = input.visibleToClients;
  }
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl ?? null;
  if (input.rules !== undefined) patch.rules = input.rules;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("room_categories")
    .update(patch as never)
    .eq("legacy_id", id)
    .select("legacy_id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage rooms at this facility.",
      duplicate: "A category with that name already exists.",
    });
  }

  const denied = deniedIfUntouched(
    data,
    "Not allowed to change this category.",
  );
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

  const { data: category } = await supabase
    .from("room_categories")
    .select("id")
    .eq("legacy_id", id)
    .maybeSingle();

  if (!category) {
    return NextResponse.json({ error: "No such category." }, { status: 404 });
  }

  // Counted before the delete so the refusal can say how many. The FK would
  // refuse anyway, but with a constraint name instead of a sentence.
  const { count } = await supabase
    .from("facility_rooms")
    .select("id", { count: "exact", head: true })
    .eq("category_id", category.id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: `This category still has ${count} room${count === 1 ? "" : "s"} in it. Remove them first.`,
      },
      { status: 409 },
    );
  }

  const { data: removed, error } = await supabase
    .from("room_categories")
    .delete()
    .eq("legacy_id", id)
    .select("legacy_id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage rooms at this facility.",
      duplicate: "That category cannot be removed.",
    });
  }

  // The category existed a moment ago and none was removed, so the policy
  // refused it — an RLS-denied DELETE matches nothing and reports success.
  const denied = deniedIfUntouched(
    removed,
    "Not allowed to remove this category.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}

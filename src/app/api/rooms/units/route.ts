import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import type { FacilityRoom } from "@/types/rooms";

// ============================================================================
// Adding a single room to a category.
//
// The category's own POST creates units in bulk when a category is first
// described; this is the one-off — a wing gains a kennel, or one that was
// removed comes back.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request
    .json()
    .catch(() => null)) as Partial<FacilityRoom> | null;

  if (!input?.name?.trim()) {
    return NextResponse.json(
      { error: "A room needs a name." },
      { status: 422 },
    );
  }
  if (!input.categoryId) {
    return NextResponse.json(
      { error: "A room needs a category." },
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
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  // The app carries `cat-*` ids; the row keys on uuid. Resolved through RLS, so
  // a caller who cannot see the category simply gets nothing back.
  const { data: category } = await supabase
    .from("room_categories")
    .select("id")
    .eq("legacy_id", input.categoryId)
    .maybeSingle();

  if (!category) {
    return NextResponse.json({ error: "No such category." }, { status: 422 });
  }

  const { count } = await supabase
    .from("facility_rooms")
    .select("id", { count: "exact", head: true })
    .eq("category_id", category.id);

  const legacyId =
    input.id?.trim() ||
    `${input.categoryId}-${String((count ?? 0) + 1).padStart(2, "0")}`;

  const { data: created, error } = await supabase
    .from("facility_rooms")
    .insert({
      facility_id: facility.facilityId,
      category_id: category.id,
      legacy_id: legacyId,
      name: input.name.trim(),
      active: input.active ?? true,
      // undefined and null both mean "use the category's default"; a 1 written
      // here would silently stop tracking the category.
      capacity: input.capacity ?? null,
      staff_notes: input.staffNotes ?? null,
      image_url: input.imageUrl ?? null,
      sort_order: (count ?? 0) + 1,
    } as never)
    .select("legacy_id")
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage rooms at this facility.",
      duplicate: "A room with that name already exists in this category.",
    });
  }

  return NextResponse.json(
    { id: (created as { legacy_id: string }).legacy_id },
    { status: 201 },
  );
}

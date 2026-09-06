import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import {
  TAG_SELECT,
  rowToTag,
  tagPatchSchema,
  tagPatchToUpdate,
  type TagRow,
} from "@/lib/api/mappers/tag";

// ============================================================================
// One tag.
//
// ── DELETE DEACTIVATES, IT DOES NOT REMOVE ────────────────────────────────
//
// `facility_tag_assignments.tag_id` cascades, so a real DELETE would silently
// take every assignment with it — a facility retiring "Puppy" would strip the
// flag off forty pets with no way back, and the settings screen calls the
// button "Delete". So the write clears `is_active` and the assignments stay,
// which is also what the fixture's own handler did.
//
// A tag a facility genuinely wants gone, assignments and all, is a different
// action with a different sentence in front of it, and nothing asks for it yet.
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
  const parsed = tagPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a tag.", detail: parsed.error.issues },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("facility_tags")
    .update(tagPatchToUpdate(parsed.data))
    .eq("id", id)
    .select(TAG_SELECT);

  if (error) {
    return writeFailure(error, {
      duplicate: "A tag with that name already exists.",
      denied: "You do not have permission to change this facility's tags.",
    });
  }

  const denied = deniedIfUntouched(
    data,
    "You do not have permission to change this facility's tags.",
  );
  if (denied) return denied;

  return NextResponse.json(rowToTag(data![0] as unknown as TagRow));
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

  // See the header: retiring a tag, not deleting its assignments.
  const { data, error } = await supabase
    .from("facility_tags")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "A tag with that name already exists.",
      denied: "You do not have permission to change this facility's tags.",
    });
  }

  const denied = deniedIfUntouched(
    data,
    "You do not have permission to change this facility's tags.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}

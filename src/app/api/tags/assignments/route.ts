import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import {
  TAG_ASSIGNMENT_SELECT,
  TAG_ENTITY_TABLE,
  rowToTagAssignment,
  tagAssignmentWriteSchema,
  type TagAssignmentInsert,
  type TagAssignmentRow,
} from "@/lib/api/mappers/tag";
import type { TablesInsert } from "@/types/database";

// ============================================================================
// Putting a tag on a pet, a client or a booking.
//
// ── THE REF IS RESOLVED THROUGH RLS, NOT TRUSTED ──────────────────────────
//
// The caller sends the numeric `ref` its screen holds. This looks the row up in
// `pets` / `clients` / `bookings`, which RLS has already scoped to what the
// caller may read, and uses the uuid that comes back. Naming somebody else's
// pet resolves to nothing and gets a 404 — the same shape as taking the
// facility from the session rather than the request, one level down.
//
// The facility is NOT sent and not taken from the session either: the
// `facility_tag_assignments_set_facility` trigger copies it from the tag, and
// raises if the tag's entity_type disagrees with the assignment's.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = tagAssignmentWriteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a tag assignment.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const { tagId, entityType, entityRef } = parsed.data;

  const supabase = await createServerClient();

  // BOTH ends are resolved through RLS before anything is written, and the tag
  // end is not optional politeness.
  //
  // MEASURED, by the spec that now guards it: without this, a caller naming a
  // tag id that does not exist got a **500**. The
  // `facility_tag_assignments_set_facility` trigger runs BEFORE the `with
  // check` policy, finds no tag, and raises — so RLS never got to refuse and
  // the caller was told the server had broken.
  const { data: tag } = await supabase
    .from("facility_tags")
    .select("id")
    .eq("id", tagId)
    .maybeSingle();

  if (!tag?.id) {
    return NextResponse.json(
      { error: "There is no such tag." },
      { status: 404 },
    );
  }

  const { data: target } = await supabase
    .from(TAG_ENTITY_TABLE[entityType])
    .select("id")
    .eq("ref", entityRef)
    .maybeSingle();

  if (!target?.id) {
    return NextResponse.json(
      { error: "There is no such record to tag." },
      { status: 404 },
    );
  }

  // `facility_id` is left off deliberately — the trigger sets it from the tag.
  // See `TagAssignmentInsert`. The cast is because the generated type cannot
  // express "a trigger fills this in".
  const insert: TagAssignmentInsert = {
    tag_id: tagId,
    entity_type: entityType,
    entity_id: target.id,
    assigned_by: user.id,
  };

  const { data, error } = await supabase
    .from("facility_tag_assignments")
    .insert(insert as TablesInsert<"facility_tag_assignments">)
    .select(TAG_ASSIGNMENT_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      duplicate: "That tag is already on this record.",
      denied: "You do not have permission to tag this record.",
    });
  }

  return NextResponse.json(
    rowToTagAssignment(data as unknown as TagAssignmentRow, entityRef),
    { status: 201 },
  );
}

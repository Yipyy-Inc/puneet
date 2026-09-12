import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  TRAINING_NOTE_SELECT,
  rowToTrainerNote,
  trainingNotePatchSchema,
  type TrainingNoteRow,
} from "@/lib/api/mappers/training-note";
import type { TablesUpdate } from "@/types/database";

// ============================================================================
// PATCH /api/training/notes/[id] — edit, pin, raise or LIFT an alert.
// DELETE                          — remove the note.
//
// Lifting an alert keeps the note and records why; the reason is required by
// the table as well as by this schema, so an alert cannot be lifted silently.
// An update RLS refuses touches no row, which `deniedIfUntouched` turns into
// a 403 rather than a quiet success.
// ============================================================================

export const dynamic = "force-dynamic";

const DENIED = "You do not have permission to change this note.";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = trainingNotePatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a change to a note.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const patch = parsed.data;

  const supabase = await createServerClient();
  const { data: current } = await supabase
    .from("training_notes")
    .select("id, pet_id")
    .eq("id", id)
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "No such note." }, { status: 404 });
  }
  const petId = (current as { pet_id: string }).pet_id;

  const viewer = await getViewer().catch(() => null);
  const now = new Date().toISOString();
  const update: TablesUpdate<"training_notes"> = {};
  if (patch.note !== undefined) update.body = patch.note;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.isPrivate !== undefined) update.is_private = patch.isPrivate;
  if (patch.isActiveAlert !== undefined) {
    update.is_active_alert = patch.isActiveAlert;
    // Raising it again clears the last lift.
    if (patch.isActiveAlert) {
      update.deactivated_at = null;
      update.deactivation_reason = null;
      update.deactivated_by_name = null;
    }
  }
  if (patch.deactivate) {
    update.deactivated_at = now;
    update.deactivation_reason = patch.deactivate.reason;
    update.deactivated_by_name = viewer?.fullName ?? viewer?.email ?? null;
  }
  if (patch.isPinnedToProfile !== undefined) {
    update.is_pinned = patch.isPinnedToProfile;
    update.pinned_at = patch.isPinnedToProfile ? now : null;
    if (patch.isPinnedToProfile) {
      // One pinned note per pet — the previous pin gives way.
      await supabase
        .from("training_notes")
        .update({ is_pinned: false, pinned_at: null })
        .eq("pet_id", petId)
        .eq("is_pinned", true)
        .neq("id", id)
        .select("id"); // rls-write-ok: clearing the previous pin; the update below reports a refusal
    }
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("training_notes")
    .update(update)
    .eq("id", id)
    .select(TRAINING_NOTE_SELECT);

  if (error) {
    return writeFailure(error, {
      duplicate: "Another note is already pinned for this pet.",
      denied: DENIED,
    });
  }
  const denied = deniedIfUntouched(data, DENIED);
  if (denied) return denied;

  return NextResponse.json(
    rowToTrainerNote((data as unknown as TrainingNoteRow[])[0]),
  );
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
  const { data, error } = await supabase
    .from("training_notes")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, { duplicate: DENIED, denied: DENIED });
  }
  const denied = deniedIfUntouched(data, DENIED);
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}

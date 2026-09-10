import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { notePatchSchema, type NoteRow } from "@/lib/api/mappers/note";
import type { NoteEdit } from "@/types/tags";
import type { Json, TablesUpdate } from "@/types/database";

// ============================================================================
// Editing, pinning, sharing and deleting one note.
//
// An edit to the WORDS appends the previous text to `edit_history`, which is
// what the note's history dialog reads. A pin or a visibility change does
// not: neither is an edit anybody would look for in a history of what the
// note said.
//
// Both writes end in `.select()` so a policy refusal — which is zero rows,
// not an error — is a 403 rather than a success (check:rls-writes).
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
  const parsed = notePatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a change to a note.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const patch = parsed.data;

  const supabase = await createServerClient();
  const { data: current } = await supabase
    .from("notes")
    .select("id, content, edit_history")
    .eq("id", id)
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "No such note." }, { status: 404 });
  }
  const row = current as Pick<NoteRow, "id" | "content" | "edit_history">;

  const viewer = await getViewer().catch(() => null);
  const actor = viewer?.fullName ?? viewer?.email ?? "";
  const update: TablesUpdate<"notes"> = {};
  if (patch.isPinned !== undefined) update.is_pinned = patch.isPinned;
  if (patch.visibility !== undefined) update.visibility = patch.visibility;
  if (patch.content !== undefined && patch.content !== row.content) {
    const edit: NoteEdit = {
      id: randomUUID(),
      noteId: id,
      previousContent: row.content,
      newContent: patch.content,
      editedAt: new Date().toISOString(),
      editedBy: actor,
    };
    update.content = patch.content;
    update.edit_history = [
      ...(row.edit_history ?? []),
      edit,
    ] as unknown as Json;
    update.updated_by_name = actor || null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ id });
  }

  const { data, error } = await supabase
    .from("notes")
    .update(update)
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, { duplicate: DENIED, denied: DENIED });
  }
  const denied = deniedIfUntouched(data, DENIED);
  if (denied) return denied;

  return NextResponse.json({ id });
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
    .from("notes")
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

import { NextResponse, type NextRequest } from "next/server";

import { deniedIfUntouched } from "@/lib/api/rls-write";
import { getViewer } from "@/lib/auth/viewer";
import {
  DEFINITION_SELECT,
  toDefinitionRow,
  type TaskDefinitionRow,
} from "@/lib/api/mappers/task-group";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables, TablesUpdate } from "@/types/database";

// ============================================================================
// Editing or retiring one chore.
//
// ── EDITING DOES NOT REACH WORK ALREADY GENERATED ─────────────────────────
//
// A task copies the chore's wording at the moment it is created, so renaming
// "hose down run 3" tomorrow leaves the task somebody finished this morning
// saying what they were actually asked. That is not enforced here — it is a
// property of the copy, and `supabase/tests/facility-task-groups.sql` C6 is
// where it is proved.
//
// ── THERE IS NO DELETE VERB ───────────────────────────────────────────────
//
// A chore named by a group is `on delete restrict`, so a delete would succeed
// for the unused ones and fail for exactly the ones people care about. Retiring
// (`isActive: false`) is the operation, and it is the one the screen offers.
// ============================================================================

export const dynamic = "force-dynamic";

export interface UpdateDefinitionResult {
  definition: TaskDefinitionRow;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    title?: string;
    description?: string | null;
    category?: string;
    priority?: string;
    estimatedMinutes?: number | null;
    requiresPhoto?: boolean;
    requiresSignoff?: boolean;
    isActive?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const patch: TablesUpdate<"facility_task_definitions"> = {};

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json(
        { error: "A chore needs a name." },
        { status: 400 },
      );
    }
    patch.title = title;
  }

  if (body.priority !== undefined) {
    const PRIORITIES = ["low", "medium", "high", "urgent"];
    if (!PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { error: `A priority is one of ${PRIORITIES.join(", ")}.` },
        { status: 400 },
      );
    }
    patch.priority = body.priority;
  }

  if (body.description !== undefined) patch.description = body.description;
  if (body.category !== undefined) patch.category = body.category;
  if (body.estimatedMinutes !== undefined)
    patch.estimated_minutes = body.estimatedMinutes;
  if (body.requiresPhoto !== undefined)
    patch.requires_photo = body.requiresPhoto;
  if (body.requiresSignoff !== undefined)
    patch.requires_signoff = body.requiresSignoff;
  if (body.isActive !== undefined) patch.is_active = body.isActive;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const supabase = await createServerClient();

  // `.select()` so an RLS refusal is visible: an UPDATE that fails a `using`
  // policy affects zero rows and returns success.
  const { data, error } = await supabase
    .from("facility_task_definitions")
    .update(patch)
    .eq("id", id)
    .select(DEFINITION_SELECT);

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const refused = deniedIfUntouched(
    data,
    "You are not allowed to change the chore list.",
  );
  if (refused) return refused;

  const result: UpdateDefinitionResult = {
    definition: toDefinitionRow(
      (data as Tables<"facility_task_definitions">[])[0],
    ),
  };
  return NextResponse.json(result);
}

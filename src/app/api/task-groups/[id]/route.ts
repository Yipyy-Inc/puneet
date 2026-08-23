import { NextResponse, type NextRequest } from "next/server";

import { deniedIfUntouched } from "@/lib/api/rls-write";
import { getViewer } from "@/lib/auth/viewer";
import {
  GROUP_SELECT,
  toGroupRow,
  type TaskGroupRecord,
  type TaskGroupRow,
} from "@/lib/api/mappers/task-group";
import { createServerClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

// ============================================================================
// Changing one chore group, including which chores are in it.
//
// ── THE CONTENTS ARE REPLACED WHOLE, NOT PATCHED ──────────────────────────
//
// `definitionIds` is the complete list or it is absent. A group's chores are
// re-ordered as often as they are added to, and an add/remove/reorder API over
// a join table is three endpoints and a race where a screen sends a reorder
// while somebody else is removing a line.
//
// The replace is delete-then-insert inside one request. That is not atomic
// across the two statements, and the honest consequence is that a failure
// halfway leaves the group with fewer chores rather than with the old set —
// which is visible on the screen, and recoverable by saving again. A
// transaction would need an RPC, and an RPC would need to be SECURITY DEFINER
// or duplicate the permission check; neither is worth it for a list a person
// is looking at while they edit it.
// ============================================================================

export const dynamic = "force-dynamic";

export interface UpdateGroupResult {
  group: TaskGroupRow;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("facility_task_groups")
    .select(GROUP_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "No such group." }, { status: 404 });
  }

  return NextResponse.json({
    group: toGroupRow(data as unknown as TaskGroupRecord),
  });
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
    name?: string;
    description?: string | null;
    daysOfWeek?: number[];
    isActive?: boolean;
    definitionIds?: string[];
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const patch: TablesUpdate<"facility_task_groups"> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "A group needs a name." },
        { status: 400 },
      );
    }
    patch.name = name;
  }
  if (body.description !== undefined) patch.description = body.description;
  if (body.daysOfWeek !== undefined) patch.days_of_week = body.daysOfWeek;
  if (body.isActive !== undefined) patch.is_active = body.isActive;

  // `scope`, `shift_key` and `department_id` are deliberately absent: changing
  // what a group is FOR is not an edit, it is a different group, and doing it
  // in place would silently re-point every future generation.

  // REPLACING THE CHORES IS A CHANGE TO THE GROUP, so it touches the group row
  // even when nothing else was sent. That is not bookkeeping — it is what makes
  // the permission check below reach a row that always exists.
  //
  // Without it, a request carrying ONLY `definitionIds` skips the update
  // entirely and the DELETE is the first write. `authenticated` holds the
  // DELETE privilege (measured, not assumed — a default privilege grants it),
  // so a caller the policy refuses removes zero rows and PostgREST answers
  // success. The screen would report the chores replaced and they would still
  // be there.
  //
  // `deniedIfUntouched` on the delete itself cannot work: a group with no
  // chores yet legitimately deletes nothing, and that is indistinguishable
  // from a refusal.
  if (body.definitionIds !== undefined && Object.keys(patch).length === 0) {
    patch.updated_at = new Date().toISOString();
  }

  if (Object.keys(patch).length > 0) {
    patch.updated_at = new Date().toISOString();

    // `.select()` so an RLS refusal is visible: an UPDATE that fails a `using`
    // policy affects zero rows and returns success.
    const { data, error } = await supabase
      .from("facility_task_groups")
      .update(patch)
      .eq("id", id)
      .select("id");

    if (error) {
      if (error.code === "42501") {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const refused = deniedIfUntouched(
      data,
      "You are not allowed to change that group.",
    );
    if (refused) return refused;
  }

  if (body.definitionIds !== undefined) {
    // rls-write-ok: the group UPDATE above always runs when `definitionIds` is
    // present, and `deniedIfUntouched` on it has already refused a caller the
    // policy would refuse here. A zero-row delete at this point means the group
    // had no chores, not that permission was denied.
    const { error: clearError } = await supabase
      .from("facility_task_group_items")
      .delete()
      .eq("group_id", id);

    if (clearError) {
      if (clearError.code === "42501") {
        return NextResponse.json(
          { error: clearError.message },
          { status: 403 },
        );
      }
      return NextResponse.json({ error: clearError.message }, { status: 400 });
    }

    if (body.definitionIds.length > 0) {
      const { error: addError } = await supabase
        .from("facility_task_group_items")
        .insert(
          body.definitionIds.map((definitionId, index) => ({
            group_id: id,
            definition_id: definitionId,
            sort_order: index,
          })),
        );
      if (addError) {
        return NextResponse.json({ error: addError.message }, { status: 400 });
      }
    }
  }

  const { data: full } = await supabase
    .from("facility_task_groups")
    .select(GROUP_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (!full) {
    return NextResponse.json({ error: "No such group." }, { status: 404 });
  }

  const result: UpdateGroupResult = {
    group: toGroupRow(full as unknown as TaskGroupRecord),
  };
  return NextResponse.json(result);
}

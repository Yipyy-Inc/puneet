import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  TASK_SELECT,
  toTaskRow,
  type TaskRecord,
  type TaskRow,
} from "@/lib/api/mappers/facility-task";
import { createServerClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

// ============================================================================
// Changing one task.
//
// ── COMPLETION IS ONE FACT, SO THIS ROUTE WRITES BOTH COLUMNS ─────────────
//
// A caller says `status: "completed"` and the route stamps `completed_at`
// itself, from the server's clock. It is not an accepted field: a client that
// could name its own completion time could report work as finished yesterday.
// The table's check constraint refuses the pair disagreeing either way, so a
// bug here is a 400 rather than a row that quietly breaks every turnaround
// report.
//
// ── WHAT A NON-MANAGER MAY CHANGE IS THE DATABASE'S CALL ──────────────────
//
// This route sends whatever it was asked for. `private.task_owner_moves_status_only`
// refuses a person without `ops_manage_tasks` who tries to retitle a task or
// hand it to somebody else — so the rule holds for PostgREST callers too, not
// only for people coming through here.
// ============================================================================

export const dynamic = "force-dynamic";

export interface UpdateTaskResult {
  task: TaskRow;
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
    .from("facility_tasks")
    .select(TASK_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "No such task." }, { status: 404 });
  }

  return NextResponse.json({ task: toTaskRow(data as unknown as TaskRecord) });
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
    status?: string;
    assignedTo?: string | null;
    dueAt?: string | null;
    estimatedMinutes?: number | null;
    requiresPhoto?: boolean;
    requiresSignoff?: boolean;
    notes?: string | null;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const patch: TablesUpdate<"facility_tasks"> = {};

  if (body.status !== undefined) {
    const STATUSES = ["pending", "in_progress", "completed", "cancelled"];
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json(
        {
          error: `A task moves to ${STATUSES.join(", ")} — not '${body.status}'.`,
        },
        { status: 400 },
      );
    }
    patch.status = body.status;
    // The server's clock, both ways. Re-opening a finished task has to clear
    // the stamp or the constraint refuses the row — which is the constraint
    // catching a bug rather than the bug reaching a report.
    patch.completed_at =
      body.status === "completed" ? new Date().toISOString() : null;
  }

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json(
        { error: "A task needs a title." },
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
  if (body.assignedTo !== undefined) patch.assigned_to = body.assignedTo;
  if (body.dueAt !== undefined) patch.due_at = body.dueAt;
  if (body.estimatedMinutes !== undefined)
    patch.estimated_minutes = body.estimatedMinutes;
  if (body.requiresPhoto !== undefined)
    patch.requires_photo = body.requiresPhoto;
  if (body.requiresSignoff !== undefined)
    patch.requires_signoff = body.requiresSignoff;
  if (body.notes !== undefined) patch.notes = body.notes;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const supabase = await createServerClient();

  // `.select()` so an RLS refusal is visible: an UPDATE that fails a `using`
  // policy affects zero rows and returns success.
  const { data, error } = await supabase
    .from("facility_tasks")
    .update(patch)
    .eq("id", id)
    .select(TASK_SELECT);

  if (error) {
    // 42501 is both the RLS refusal and the trigger's own message. The trigger
    // writes for a person, so its sentence is the one worth showing.
    if (error.code === "42501") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const refused = deniedIfUntouched(
    data,
    "You are not allowed to change that task.",
  );
  if (refused) return refused;

  const result: UpdateTaskResult = {
    task: toTaskRow((data as unknown as TaskRecord[])[0]),
  };
  return NextResponse.json(result);
}

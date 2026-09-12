import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import {
  TRAINING_HOMEWORK_SELECT,
  rowToTrainingHomework,
  trainingHomeworkPatchSchema,
  type TrainingHomeworkRow,
} from "@/lib/api/mappers/training-homework";

// ============================================================================
// /api/training/homework/[id] — edit, complete or reopen, and delete.
//
// Authorised by training_homework's policies (training_log_progress), not by
// this file. Each write selects what it touched, because RLS reports a
// refusal as zero rows rather than as an error, and a refusal must not come
// back as a 200.
// ============================================================================

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

type HomeworkUpdate = {
  title?: string;
  description?: string;
  instructions?: string[];
  resources?: string[];
  frequency?: string | null;
  next_due_date?: string | null;
  completed_at?: string | null;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json(
      { error: "That homework does not exist." },
      { status: 404 },
    );
  }

  const parsed = trainingHomeworkPatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "That is not a change to homework.",
        detail: parsed.error.issues,
      },
      { status: 422 },
    );
  }
  const patch = parsed.data;

  const update: HomeworkUpdate = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.instructions !== undefined) {
    update.instructions = patch.instructions;
  }
  if (patch.resources !== undefined) update.resources = patch.resources;
  if (patch.frequency !== undefined) update.frequency = patch.frequency || null;
  if (patch.nextDueDate !== undefined) update.next_due_date = patch.nextDueDate;
  if (patch.completed !== undefined) {
    update.completed_at = patch.completed ? new Date().toISOString() : null;
    // Completed homework is due nothing more.
    if (patch.completed) update.next_due_date = null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("training_homework")
    .update(update)
    .eq("id", id)
    .select(TRAINING_HOMEWORK_SELECT)
    .maybeSingle();
  if (error) {
    return writeFailure(error, {
      duplicate: "That homework is already assigned.",
      denied: "You do not have permission to change training homework.",
    });
  }
  if (!data) {
    return NextResponse.json(
      { error: "That homework does not exist, or is not yours to change." },
      { status: 403 },
    );
  }
  return NextResponse.json(
    rowToTrainingHomework(data as unknown as TrainingHomeworkRow),
  );
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json(
      { error: "That homework does not exist." },
      { status: 404 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("training_homework")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    return writeFailure(error, {
      duplicate: "That homework could not be deleted.",
      denied: "You do not have permission to delete training homework.",
    });
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "That homework does not exist, or is not yours to delete." },
      { status: 403 },
    );
  }
  return NextResponse.json({ ok: true });
}

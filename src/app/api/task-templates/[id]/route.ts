import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  TASK_TEMPLATE_SELECT,
  rowToTaskTemplate,
  patchToUpdate,
  type TaskTemplateRow,
} from "@/lib/api/mappers/task-template";
import { taskTemplatePatchSchema } from "@/types/task-template";

// ============================================================================
// Editing and removing one template.
//
// Both are authorised by `ops_manage_checklists` in the policy, not here.
//
// Both also `.select()` their result, which is the point rather than a detail:
// an UPDATE or DELETE that RLS refuses affects ZERO ROWS and PostgREST calls
// that success. Without reading back what changed, a staff member without the
// permission would be told their edit saved. That is the shape
// `check:rls-writes` exists to catch, and it is the shape the fixture this
// replaces had in its own way — `removeTemplate` on a default template
// silently removed nothing and reported success.
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
  const parsed = taskTemplatePatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a task template.", detail: parsed.error.issues },
      { status: 422 },
    );
  }

  const columns = patchToUpdate(parsed.data);
  if (Object.keys(columns).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("task_templates")
    .update(columns)
    .eq("id", id)
    .select(TASK_TEMPLATE_SELECT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      {
        error:
          "That task could not be changed — you may not have permission, or it may no longer exist.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json(
    rowToTaskTemplate(data[0] as unknown as TaskTemplateRow),
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
    .from("task_templates")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      {
        error:
          "That task could not be removed — you may not have permission, or it may already be gone.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}

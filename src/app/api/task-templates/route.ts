import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import {
  TASK_TEMPLATE_SELECT,
  rowToTaskTemplate,
  newTemplateToInsert,
  type TaskTemplateRow,
} from "@/lib/api/mappers/task-template";
import { newTaskTemplateSchema } from "@/types/task-template";

// ============================================================================
// A facility's care routine.
//
// Scoped by RLS: `task_templates_select` admits any active member of the
// facility, and the write policies require `ops_manage_checklists`. The
// `module` filter below narrows what you asked for; it is not what keeps you
// out, and no facility id is accepted from the caller.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("task_templates")
    .select(TASK_TEMPLATE_SELECT)
    .order("sort_order", { ascending: true });

  // A real column on this table, not an embedded one — so unlike the report
  // card filters this needs no inner join to narrow.
  const moduleId = searchParams.get("module");
  if (moduleId) query = query.eq("module_id", moduleId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as TaskTemplateRow[];
  return NextResponse.json(rows.map(rowToTaskTemplate));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = newTaskTemplateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a task template.", detail: parsed.error.issues },
      { status: 422 },
    );
  }

  // From the session, never the request — check:facility-from-session.
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("task_templates")
    .insert(newTemplateToInsert(parsed.data, facility.facilityId, user.id))
    .select(TASK_TEMPLATE_SELECT)
    .single();

  if (error) {
    // 42501 is `task_templates_insert` refusing: the caller does not hold
    // ops_manage_checklists. A 403 rather than a 500, because nothing is
    // broken — they are not allowed.
    const denied = error.code === "42501";
    return NextResponse.json(
      {
        error: denied
          ? "You do not have permission to change this facility's task list."
          : error.message,
      },
      { status: denied ? 403 : 500 },
    );
  }

  return NextResponse.json(
    rowToTaskTemplate(data as unknown as TaskTemplateRow),
    { status: 201 },
  );
}

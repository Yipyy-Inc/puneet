import { NextResponse, type NextRequest } from "next/server";

import { deniedIfUntouched } from "@/lib/api/rls-write";
import { getViewer } from "@/lib/auth/viewer";
import {
  TEMPLATE_SELECT,
  toScheduleTemplateRow,
  type ScheduleTemplateRecord,
  type ScheduleTemplateRow,
} from "@/lib/api/mappers/schedule-template";
import { createServerClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

// ============================================================================
// Editing or retiring one schedule template.
//
// ── EDITING A TEMPLATE DOES NOT REACH A WEEK ALREADY APPLIED ──────────────
//
// Applying copies each line into a `staff_shifts` row. Rewriting the template
// afterwards changes what NEXT week will look like and leaves the roster people
// are already working to exactly as it was. Same rule as the chore library and
// the frozen form versions.
//
// ── DELETING IS PERMITTED, AND TAKES ONLY THE TEMPLATE ────────────────────
//
// A template is configuration, not a record — deleting one somebody built by
// mistake is housekeeping. Its LINES go with it (`on delete cascade`); the
// SHIFTS it already created do not, because somebody is rostered on those days
// and deleting the template is not a statement about whether they are working.
//
// The applications go too, which is correct and worth saying: they exist to
// stop a week being applied twice, and once the template is gone there is
// nothing left to apply.
// ============================================================================

export const dynamic = "force-dynamic";

export interface UpdateTemplateResult {
  template: ScheduleTemplateRow;
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
    .from("schedule_templates")
    .select(TEMPLATE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "No such template." }, { status: 404 });
  }

  return NextResponse.json({
    template: toScheduleTemplateRow(data as unknown as ScheduleTemplateRecord),
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
    isActive?: boolean;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const patch: TablesUpdate<"schedule_templates"> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "A template needs a name." },
        { status: 400 },
      );
    }
    patch.name = name;
  }
  if (body.description !== undefined) patch.description = body.description;
  if (body.isActive !== undefined) patch.is_active = body.isActive;

  // `department_id` is deliberately absent. Re-pointing a template at another
  // department while its lines still name the old one's positions would make
  // every future application inconsistent with itself.
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const supabase = await createServerClient();

  // `.select()` so an RLS refusal is visible: an UPDATE that fails a `using`
  // policy affects zero rows and returns success.
  const { data, error } = await supabase
    .from("schedule_templates")
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
    "You are not allowed to change that template.",
  );
  if (refused) return refused;

  const { data: full } = await supabase
    .from("schedule_templates")
    .select(TEMPLATE_SELECT)
    .eq("id", id)
    .maybeSingle();

  const result: UpdateTemplateResult = {
    template: toScheduleTemplateRow(full as unknown as ScheduleTemplateRecord),
  };
  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  // `.select()` so a refusal is visible. `authenticated` holds the DELETE
  // privilege — measured, because a default privilege in this project grants it
  // whether or not a grant mentions it — so a policy refusal removes zero rows
  // and answers success. Here zero rows genuinely means denied or absent, since
  // the id names one row or none.
  const { data, error } = await supabase
    .from("schedule_templates")
    .delete()
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
    "You are not allowed to delete that template.",
  );
  if (refused) return refused;

  return NextResponse.json({ deleted: true });
}

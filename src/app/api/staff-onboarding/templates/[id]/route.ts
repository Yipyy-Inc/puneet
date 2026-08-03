import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  TEMPLATE_SELECT,
  rowToOnboardingTemplate,
  templateToRow,
} from "@/lib/api/mappers/staff-onboarding";
import { writeFailure } from "@/lib/api/write-failure";
import { insertTemplateTasks } from "@/lib/api/onboarding-task-writes";
import type { OnboardingTemplate } from "@/data/staff-onboarding";

// ============================================================================
// One onboarding template.
//
// PATCH REPLACES THE TASK LIST, rather than diffing it.
//
// The alternative — match incoming tasks to stored ones, update the overlap,
// insert the new, delete the missing — has to answer "which stored task is this
// one" for rows the editor may have reordered, renamed and retyped in the same
// save. It would key on the app-side id, which for a task created in the editor
// does not exist yet. Replace-all has one honest failure mode (a task's row id
// changes) and no ambiguous ones, and nothing yet references a task row by id:
// per-hire instances will, and when they do this becomes a real diff with a
// migration behind it. Doing that now would be building the hard version
// against a requirement that has not arrived.
//
// It happens in ONE transaction only in the sense that Postgres gives each
// statement one — a delete that succeeds followed by an insert that fails would
// leave a template with no tasks. Accepted deliberately: the insert can only
// fail on a CHECK the client controls (within_days without a day count), the
// error says so, and a re-save fixes it. The alternative is an RPC wrapping both
// in a function, which is the right answer once tasks are referenced elsewhere.
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
  const input = (await request.json()) as Partial<OnboardingTemplate>;
  const supabase = await createServerClient();

  const existing = await findTemplate(supabase, id);
  if (!existing) {
    // Unreadable and absent are the same answer, on purpose: telling a caller
    // that a template they may not see EXISTS is itself a disclosure.
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("onboarding_templates")
    .update(templateToRow(input) as never)
    .eq("id", existing.id);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to edit this template.",
      duplicate: "Another template already uses that id.",
    });
  }

  // Only touch tasks when the caller sent them. A PATCH of just `status`
  // (activating a draft) must not silently empty the checklist.
  if (input.managerTasks !== undefined || input.employeeTasks !== undefined) {
    if (input.managerTasks !== undefined) {
      await supabase
        .from("onboarding_manager_tasks")
        .delete()
        .eq("template_id", existing.id);
    }
    if (input.employeeTasks !== undefined) {
      await supabase
        .from("onboarding_employee_tasks")
        .delete()
        .eq("template_id", existing.id);
    }
    const taskError = await insertTemplateTasks(
      supabase,
      { templateId: existing.id, facilityId: existing.facility_id },
      input,
    );
    if (taskError) return taskError;
  }

  const { data: full } = await supabase
    .from("onboarding_templates")
    .select(TEMPLATE_SELECT)
    .eq("id", existing.id)
    .single();

  return NextResponse.json(rowToOnboardingTemplate(full!));
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

  const existing = await findTemplate(supabase, id);
  if (!existing) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  // Tasks cascade with the template (`on delete cascade`), which is right: a
  // task has no meaning without the checklist it belongs to.
  const { error } = await supabase
    .from("onboarding_templates")
    .delete()
    .eq("id", existing.id);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to delete this template.",
      duplicate: "",
    });
  }

  // A refusal matches ZERO ROWS rather than erroring, so "denied" and "already
  // gone" look identical from the result. Reading back tells them apart.
  const { data: survivor } = await supabase
    .from("onboarding_templates")
    .select("id")
    .eq("id", existing.id)
    .maybeSingle();

  if (survivor) {
    return NextResponse.json(
      { error: "Not allowed to delete this template." },
      { status: 403 },
    );
  }

  return new NextResponse(null, { status: 204 });
}

/**
 * Templates are addressed by the id the APP holds, which is `legacy_id` for a
 * seeded template and the uuid for one created since (see the mapper's `appId`).
 * Looking up both is what lets the settings screen keep its existing ids
 * through the move instead of needing a rewrite on the same day.
 */
async function findTemplate(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  id: string,
): Promise<{ id: string; facility_id: string } | null> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const { data } = await supabase
    .from("onboarding_templates")
    .select("id, facility_id")
    .eq(isUuid ? "id" : "legacy_id", id)
    .maybeSingle();

  return data ?? null;
}

import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  OFFBOARDING_TEMPLATE_SELECT,
  offboardingTasksToRows,
  offboardingTemplateToRow,
  rowToOffboardingTemplate,
} from "@/lib/api/mappers/staff-onboarding";
import { writeFailure } from "@/lib/api/write-failure";
import type { OffboardingTemplate } from "@/data/staff-onboarding";

// ============================================================================
// One offboarding template. Replace-all task semantics, for the reasons written
// up in ../../templates/[id]/route.ts.
// ============================================================================

export const dynamic = "force-dynamic";

async function findTemplate(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  id: string,
): Promise<{ id: string; facility_id: string } | null> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const { data } = await supabase
    .from("offboarding_templates")
    .select("id, facility_id")
    .eq(isUuid ? "id" : "legacy_id", id)
    .maybeSingle();
  return data ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const input = (await request.json()) as Partial<OffboardingTemplate>;
  const supabase = await createServerClient();

  const existing = await findTemplate(supabase, id);
  if (!existing) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("offboarding_templates")
    .update(offboardingTemplateToRow(input) as never)
    .eq("id", existing.id);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to edit this template.",
      duplicate: "Another template already uses that id.",
    });
  }

  if (input.managerTasks !== undefined) {
    await supabase
      .from("offboarding_tasks")
      .delete()
      .eq("template_id", existing.id);

    if (input.managerTasks.length > 0) {
      const { error: taskError } = await supabase
        .from("offboarding_tasks")
        .insert(
          offboardingTasksToRows(input.managerTasks, {
            templateId: existing.id,
            facilityId: existing.facility_id,
          }) as never,
        );
      if (taskError) {
        return writeFailure(taskError, {
          denied: "Not allowed to edit this template's tasks.",
          duplicate: "Two tasks cannot share a position.",
        });
      }
    }
  }

  const { data: full } = await supabase
    .from("offboarding_templates")
    .select(OFFBOARDING_TEMPLATE_SELECT)
    .eq("id", existing.id)
    .single();

  return NextResponse.json(rowToOffboardingTemplate(full!));
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

  const { error } = await supabase
    .from("offboarding_templates")
    .delete()
    .eq("id", existing.id);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to delete this template.",
      duplicate: "",
    });
  }

  const { data: survivor } = await supabase
    .from("offboarding_templates")
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

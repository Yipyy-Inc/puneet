import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  OFFBOARDING_TEMPLATE_SELECT,
  offboardingTasksToRows,
  offboardingTemplateToRow,
  rowToOffboardingTemplate,
} from "@/lib/api/mappers/staff-onboarding";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import type { OffboardingTemplate } from "@/data/staff-onboarding";

// ============================================================================
// Offboarding templates — the departure checklists.
//
// Same policies as onboarding templates and for the same reasons. NO role
// uniqueness rule here, deliberately: getOffboardingTemplatesForReason returns
// a LIST and the UI offers a choice, so several templates matching one
// termination reason is the design rather than an ambiguity to prevent.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("offboarding_templates")
    .select(OFFBOARDING_TEMPLATE_SELECT)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data.map(rowToOffboardingTemplate));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json()) as Partial<OffboardingTemplate>;
  if (!input.name?.trim()) {
    return NextResponse.json({ error: "A name is required." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  const { data: created, error } = await supabase
    .from("offboarding_templates")
    .insert(
      offboardingTemplateToRow(input, {
        facilityId: facility.facilityId,
      }) as never,
    )
    .select("id, facility_id")
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to create offboarding templates here.",
      duplicate: "A template with that id already exists.",
    });
  }

  if (input.managerTasks?.length) {
    const { error: taskError } = await supabase
      .from("offboarding_tasks")
      .insert(
        offboardingTasksToRows(input.managerTasks, {
          templateId: created.id,
          facilityId: created.facility_id,
        }) as never,
      );
    if (taskError) {
      return writeFailure(taskError, {
        denied: "Not allowed to edit this template's tasks.",
        duplicate: "Two tasks cannot share a position.",
      });
    }
  }

  const { data: full } = await supabase
    .from("offboarding_templates")
    .select(OFFBOARDING_TEMPLATE_SELECT)
    .eq("id", created.id)
    .single();

  return NextResponse.json(rowToOffboardingTemplate(full!), { status: 201 });
}

import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  TEMPLATE_SELECT,
  rowToOnboardingTemplate,
  templateToRow,
} from "@/lib/api/mappers/staff-onboarding";
import { insertTemplateTasks } from "@/lib/api/onboarding-task-writes";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import type { OnboardingTemplate } from "@/data/staff-onboarding";

// ============================================================================
// Onboarding templates — the facility's checklists.
//
// RLS decides who: reading needs `view_onboarding` (every role preset holds it,
// because a hire working through a checklist has to see it); writing needs
// `manage_staff`. Neither is enforced here — PostgREST is reachable directly
// with the anon key and a session cookie, so this file is a convenience.
//
// WHAT CANNOT BE WRITTEN is also below this file: private.enforce_template_role
// _uniqueness refuses a second ACTIVE template for a role, because
// resolveTemplateForRole picks with `.find()` and two matches make onboarding
// depend on array order.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("onboarding_templates")
    .select(TEMPLATE_SELECT)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data.map(rowToOnboardingTemplate));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json()) as Partial<OnboardingTemplate>;
  if (!input.name?.trim()) {
    return NextResponse.json({ error: "A name is required." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  // The facility comes from the server's context, never a request field —
  // otherwise a caller could aim the permission check at a facility they hold
  // manage_staff for and write the row into one they do not.
  const { data: created, error } = await supabase
    .from("onboarding_templates")
    .insert(templateToRow(input, { facilityId: facility.facilityId }) as never)
    .select("id, facility_id")
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to create onboarding templates here.",
      duplicate: "A template with that id already exists.",
    });
  }

  // Tasks are written as a set, positioned by array index. A template with no
  // tasks is legitimate (a draft someone is still filling in), so an empty
  // array is not an error.
  const context = { templateId: created.id, facilityId: created.facility_id };
  const taskError = await insertTemplateTasks(supabase, context, input);
  if (taskError) return taskError;

  const { data: full } = await supabase
    .from("onboarding_templates")
    .select(TEMPLATE_SELECT)
    .eq("id", created.id)
    .single();

  // Echoed from the STORED row: positions were assigned server-side, so a
  // response repeating the request would show an order the database did not
  // necessarily agree with.
  return NextResponse.json(rowToOnboardingTemplate(full!), { status: 201 });
}

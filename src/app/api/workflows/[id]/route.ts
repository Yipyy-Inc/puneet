import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import {
  STEP_SELECT,
  WORKFLOW_SELECT,
  foldWorkflowUsage,
  toStep,
  toWorkflow,
} from "@/lib/api/mappers/workflow";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { channelConfigured } from "@/lib/messaging/send";
import { createServerClient } from "@/lib/supabase/server";
import { DELIVERABLE_TRIGGERS } from "@/types/automations";
import type { Tables, TablesUpdate } from "@/types/database";
import type { Workflow } from "@/types/workflows";

// ============================================================================
// One workflow: read it, change it, activate it, delete it.
//
// ── ACTIVATION IS THE ONLY DANGEROUS EDIT ─────────────────────────────────
//
// Everything else changes what a sequence SAYS. Activation changes whether real
// customers start receiving it, unattended, from now on. So it is checked
// against three things the wizard cannot see:
//
//   1. Does anything emit this trigger? (event workflows only)
//   2. Are the channels its steps use actually configured on this deployment?
//   3. Does it have any steps at all? — enforced by the database trigger too,
//      so a direct write cannot get round it.
//
// Each is a refusal with a reason, never a silent no-op.
// ============================================================================

export const dynamic = "force-dynamic";

export interface WorkflowResult {
  workflow: Workflow;
}

async function loadWorkflow(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  facilityId: string,
  id: string,
) {
  const { data } = await supabase
    .from("workflows")
    .select(WORKFLOW_SELECT)
    .eq("id", id)
    .eq("facility_id", facilityId)
    .maybeSingle();
  return (data as Tables<"workflows"> | null) ?? null;
}

async function respondWith(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  facilityId: string,
  row: Tables<"workflows">,
) {
  const [{ data: steps }, { data: enrollments }, { data: sends }] =
    await Promise.all([
      supabase
        .from("workflow_steps")
        .select(STEP_SELECT)
        .eq("workflow_id", row.id)
        .order("step_index"),
      supabase
        .from("workflow_enrollments")
        .select("workflow_id, status")
        .eq("workflow_id", row.id),
      supabase
        .from("message_sends")
        .select("source_id, status")
        .eq("facility_id", facilityId)
        .eq("source_kind", "workflow")
        .eq("source_id", row.id),
    ]);

  const usage = foldWorkflowUsage(
    (enrollments ?? []) as { workflow_id: string; status: string }[],
    (sends ?? []) as { source_id: string | null; status: string }[],
  );

  return toWorkflow(
    row,
    ((steps ?? []) as Tables<"workflow_steps">[]).map(toStep),
    usage.get(row.id),
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const supabase = await createServerClient();
  const row = await loadWorkflow(supabase, context.facilityId, id);
  if (!row) {
    return NextResponse.json({ error: "No such workflow." }, { status: 404 });
  }

  const result: WorkflowResult = {
    workflow: await respondWith(supabase, context.facilityId, row),
  };
  return NextResponse.json(result);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    description?: string | null;
    status?: string;
    audience?: unknown;
    locationIds?: string[];
    frequency?: string | null;
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    sendAtLocal?: string | null;
    minDaysBetweenSends?: number;
    stopOn?: string[];
    steps?: {
      delayMinutes?: number;
      emailTemplateId?: string | null;
      smsTemplateId?: string | null;
    }[];
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const current = await loadWorkflow(supabase, context.facilityId, id);
  if (!current) {
    return NextResponse.json({ error: "No such workflow." }, { status: 404 });
  }

  if (body.status === "active" && current.status !== "active") {
    if (
      current.kind === "event" &&
      !DELIVERABLE_TRIGGERS.has(current.trigger ?? "")
    ) {
      return NextResponse.json(
        {
          error:
            "Nothing emits that action yet, so this workflow would never start. It can be kept as a draft, but not switched on.",
        },
        { status: 409 },
      );
    }

    const { data: steps } = await supabase
      .from("workflow_steps")
      .select("email_template_id, sms_template_id")
      .eq("workflow_id", id);

    const list = (steps ?? []) as {
      email_template_id: string | null;
      sms_template_id: string | null;
    }[];
    if (list.length === 0) {
      return NextResponse.json(
        { error: "A workflow with no steps cannot be switched on." },
        { status: 409 },
      );
    }
    if (list.some((s) => s.email_template_id) && !channelConfigured("email")) {
      return NextResponse.json(
        { error: "Email is not configured on this deployment." },
        { status: 409 },
      );
    }
    if (list.some((s) => s.sms_template_id) && !channelConfigured("sms")) {
      return NextResponse.json(
        { error: "Texting is not configured on this deployment." },
        { status: 409 },
      );
    }
  }

  const patch: TablesUpdate<"workflows"> = {
    updated_at: new Date().toISOString(),
  };
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "A workflow needs a name." },
        { status: 400 },
      );
    }
    patch.name = name;
  }
  if (body.description !== undefined) patch.description = body.description;
  if (body.status !== undefined) {
    patch.status = body.status;
    if (body.status === "active" && current.status !== "active") {
      patch.activated_at = new Date().toISOString();
      patch.activated_by = viewer.userId;
    }
  }
  if (body.audience !== undefined && current.kind === "audience") {
    patch.audience = body.audience as never;
  }
  if (body.locationIds !== undefined) patch.location_ids = body.locationIds;
  if (body.frequency !== undefined) patch.frequency = body.frequency;
  if (body.dayOfWeek !== undefined) patch.day_of_week = body.dayOfWeek;
  if (body.dayOfMonth !== undefined) patch.day_of_month = body.dayOfMonth;
  if (body.sendAtLocal !== undefined) patch.send_at_local = body.sendAtLocal;
  if (body.minDaysBetweenSends !== undefined) {
    patch.min_days_between_sends = body.minDaysBetweenSends;
  }
  if (body.stopOn !== undefined) patch.stop_on = body.stopOn as never;

  // `kind` and `trigger` are deliberately NOT patchable. They are the
  // workflow's identity: changing them in place would turn a post-checkout
  // follow-up into something that fires on booking while keeping its name, its
  // enrolments and its send history. Write a new workflow instead.

  const { data, error } = await supabase
    .from("workflows")
    .update(patch)
    .eq("id", id)
    .eq("facility_id", context.facilityId)
    .select(WORKFLOW_SELECT);

  if (error) {
    return writeFailure(error, {
      denied: "Editing workflows needs permission to manage automations.",
      duplicate: "A workflow with that name already exists.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "You are not allowed to edit this workflow.",
  );
  if (denied) return denied;

  // Steps are replaced wholesale when supplied. Reconciling an edited sequence
  // in place means guessing which step is "the same one", and a wrong guess
  // silently changes what somebody receives. Enrolments already in flight are
  // unaffected either way — they carry their own snapshot.
  if (Array.isArray(body.steps)) {
    if (body.steps.length === 0) {
      return NextResponse.json(
        { error: "A workflow needs at least one message to send." },
        { status: 400 },
      );
    }
    // rls-write-ok: a refused delete cannot pass silently here. The insert
    // immediately below writes step_index 0..n-1 again, and
    // `workflow_steps_order_unique` is a UNIQUE on (workflow_id, step_index) —
    // so if the old rows survived, the insert raises 23505 and the request
    // fails loudly with that message rather than reporting a save that only
    // half happened.
    await supabase.from("workflow_steps").delete().eq("workflow_id", id);
    const { error: stepError } = await supabase.from("workflow_steps").insert(
      body.steps.map((step, i) => ({
        workflow_id: id,
        step_index: i,
        delay_minutes: step.delayMinutes ?? 0,
        email_template_id: step.emailTemplateId ?? null,
        sms_template_id: step.smsTemplateId ?? null,
      })),
    );
    if (stepError) {
      return NextResponse.json({ error: stepError.message }, { status: 400 });
    }
  }

  const result: WorkflowResult = {
    workflow: await respondWith(
      supabase,
      context.facilityId,
      data![0] as Tables<"workflows">,
    ),
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
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const supabase = await createServerClient();

  // ARCHIVED, not deleted. Enrolments cascade from the workflow, and deleting
  // one would erase the record of people who were partway through a sequence —
  // including anyone it had already messaged. `message_sends` survives either
  // way (it holds no key to the workflow), but the enrolment is the only thing
  // that explains WHY somebody got a particular message.
  const { data, error } = await supabase
    .from("workflows")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("facility_id", context.facilityId)
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied: "Removing workflows needs permission to manage automations.",
      duplicate: "That workflow could not be removed.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "You are not allowed to remove this workflow.",
  );
  if (denied) return denied;

  return NextResponse.json({ archived: id });
}

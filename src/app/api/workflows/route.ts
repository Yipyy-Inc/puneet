import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import {
  STEP_SELECT,
  WORKFLOW_SELECT,
  foldWorkflowUsage,
  toStep,
  toWorkflow,
} from "@/lib/api/mappers/workflow";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@/types/database";
import type { Workflow } from "@/types/workflows";

// ============================================================================
// Smart Workflows.
//
// ── A WORKFLOW AND ITS STEPS ARE WRITTEN TOGETHER ─────────────────────────
//
// POST takes the steps in the same body. A workflow with no steps is not a
// half-saved workflow, it is a workflow that cannot run — and the database
// refuses to ACTIVATE one, so letting the wizard create the parent and then
// fail on the children would leave a draft nobody can explain.
//
// The steps are not transactional with the parent (PostgREST has no multi-table
// insert), so a failure between them leaves a stepless DRAFT. That is the safe
// direction to fail: a draft sends nothing, and the wizard's next save replaces
// its steps wholesale.
//
// ── IT IS ALWAYS CREATED AS A DRAFT ───────────────────────────────────────
//
// Same reasoning as the rules refusing `enabled: true` on create. Activation is
// a second, deliberate act by somebody who has read what the sequence will say.
// ============================================================================

export const dynamic = "force-dynamic";

export interface WorkflowsPayload {
  workflows: Workflow[];
}

export async function GET() {
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

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("workflows")
    .select(WORKFLOW_SELECT)
    .eq("facility_id", context.facilityId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as Tables<"workflows">[];
  const ids = rows.map((r) => r.id);

  const [{ data: steps }, { data: enrollments }, { data: sends }] =
    await Promise.all([
      ids.length
        ? supabase
            .from("workflow_steps")
            .select(`workflow_id, ${STEP_SELECT}`)
            .in("workflow_id", ids)
        : Promise.resolve({ data: [] }),
      ids.length
        ? supabase
            .from("workflow_enrollments")
            .select("workflow_id, status")
            .in("workflow_id", ids)
        : Promise.resolve({ data: [] }),
      supabase
        .from("message_sends")
        .select("source_id, status")
        .eq("facility_id", context.facilityId)
        .eq("source_kind", "workflow"),
    ]);

  const usage = foldWorkflowUsage(
    (enrollments ?? []) as { workflow_id: string; status: string }[],
    (sends ?? []) as { source_id: string | null; status: string }[],
  );

  const stepsByWorkflow = new Map<string, ReturnType<typeof toStep>[]>();
  for (const row of (steps ?? []) as (Tables<"workflow_steps"> & {
    workflow_id: string;
  })[]) {
    const list = stepsByWorkflow.get(row.workflow_id) ?? [];
    list.push(toStep(row));
    stepsByWorkflow.set(row.workflow_id, list);
  }

  const payload: WorkflowsPayload = {
    workflows: rows.map((row) =>
      toWorkflow(row, stepsByWorkflow.get(row.id) ?? [], usage.get(row.id)),
    ),
  };
  return NextResponse.json(payload);
}

export interface CreateWorkflowResult {
  workflow: Workflow;
}

interface StepInput {
  delayMinutes?: number;
  emailTemplateId?: string | null;
  smsTemplateId?: string | null;
}

export async function POST(request: NextRequest) {
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

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    description?: string | null;
    kind?: string;
    trigger?: string | null;
    audience?: unknown;
    locationIds?: string[];
    frequency?: string | null;
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    sendAtLocal?: string | null;
    minDaysBetweenSends?: number;
    stopOn?: string[];
    steps?: StepInput[];
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "A workflow needs a name." },
      { status: 400 },
    );
  }

  const kind = body?.kind;
  if (kind !== "event" && kind !== "audience") {
    return NextResponse.json(
      { error: "A workflow is either action-based or audience-based." },
      { status: 400 },
    );
  }

  if (kind === "event" && !body?.trigger) {
    return NextResponse.json(
      { error: "An action-based workflow needs an action to start it." },
      { status: 400 },
    );
  }
  if (kind === "audience") {
    const groups = (body?.audience as { filterGroups?: unknown[] } | null)
      ?.filterGroups;
    if (!Array.isArray(groups) || groups.length === 0) {
      // The compiler treats an empty audience as nobody, so this would save a
      // workflow that can never run. Refuse it here where the reason can be
      // explained, rather than letting it look active and do nothing.
      return NextResponse.json(
        { error: "An audience workflow needs at least one filter." },
        { status: 400 },
      );
    }
  }

  const steps = Array.isArray(body?.steps) ? body.steps : [];
  if (steps.length === 0) {
    return NextResponse.json(
      { error: "A workflow needs at least one message to send." },
      { status: 400 },
    );
  }
  if (steps.some((s) => !s.emailTemplateId && !s.smsTemplateId)) {
    return NextResponse.json(
      { error: "Every step needs a template to send." },
      { status: 400 },
    );
  }

  // The FACILITY comes from the session, never the request.
  const insert: TablesInsert<"workflows"> = {
    facility_id: context.facilityId,
    name,
    description: body?.description ?? null,
    kind,
    status: "draft",
    trigger: kind === "event" ? (body?.trigger ?? null) : null,
    audience: kind === "audience" ? (body?.audience as never) : null,
    location_ids: body?.locationIds ?? [],
    frequency: kind === "audience" ? (body?.frequency ?? "weekly") : null,
    day_of_week: body?.dayOfWeek ?? null,
    day_of_month: body?.dayOfMonth ?? null,
    send_at_local: kind === "audience" ? (body?.sendAtLocal ?? "09:00") : null,
    min_days_between_sends: body?.minDaysBetweenSends ?? 30,
    stop_on: (body?.stopOn ?? ["booked"]) as never,
    created_by: viewer.userId,
  };

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("workflows")
    .insert(insert)
    .select(WORKFLOW_SELECT)
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      denied: "Writing workflows needs permission to manage automations.",
      duplicate: "A workflow with that name already exists.",
    });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You are not allowed to add workflows." },
      { status: 403 },
    );
  }

  const workflow = data as Tables<"workflows">;

  const stepRows: TablesInsert<"workflow_steps">[] = steps.map((step, i) => ({
    workflow_id: workflow.id,
    step_index: i,
    delay_minutes: step.delayMinutes ?? 0,
    email_template_id: step.emailTemplateId ?? null,
    sms_template_id: step.smsTemplateId ?? null,
  }));

  const { data: written, error: stepError } = await supabase
    .from("workflow_steps")
    .insert(stepRows)
    .select(STEP_SELECT);

  if (stepError) {
    // The parent survives as a stepless draft, which sends nothing. Say so
    // rather than reporting a clean success on half a workflow.
    return NextResponse.json(
      {
        error: `The workflow was saved as a draft but its steps were refused: ${stepError.message}`,
      },
      { status: 400 },
    );
  }

  const result: CreateWorkflowResult = {
    workflow: toWorkflow(
      workflow,
      ((written ?? []) as Tables<"workflow_steps">[]).map(toStep),
    ),
  };
  return NextResponse.json(result, { status: 201 });
}

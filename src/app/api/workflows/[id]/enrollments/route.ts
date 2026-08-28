import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import type { WorkflowEnrollment } from "@/types/workflows";

// ============================================================================
// Who is partway through this workflow, and taking one of them back out.
//
// ── WHY THE LIST EXISTS AT ALL ────────────────────────────────────────────
//
// The detail panel could say "4 in progress" and nothing else. That number is
// only useful if the next question — WHICH four, and can I stop one — has an
// answer. Until this landed the stop condition "Someone stops it by hand" was
// offered in the wizard with a hint pointing at a page that could not do it.
//
// ── THE STOP GOES THROUGH AN RPC ──────────────────────────────────────────
//
// `workflow_enrollments` grants a session SELECT and nothing else, on purpose:
// it is the engine's account of who was sent what. `stop_workflow_enrollment`
// (20260828161751) is the one narrow exception — it can move an active
// enrolment to 'stopped' and cancel that enrolment's queued messages, and it
// can do nothing else. The permission check lives inside the function, so this
// route does not repeat it and cannot drift from it.
// ============================================================================

export const dynamic = "force-dynamic";

export interface EnrollmentsPayload {
  enrollments: WorkflowEnrollment[];
}

/** The workflow, but only if this session's facility owns it. */
async function ownedWorkflow(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  facilityId: string,
  id: string,
) {
  const { data } = await supabase
    .from("workflows")
    .select("id")
    .eq("id", id)
    .eq("facility_id", facilityId)
    .maybeSingle();
  return (data as { id: string } | null) ?? null;
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
  if (!(await ownedWorkflow(supabase, context.facilityId, id))) {
    return NextResponse.json({ error: "No such workflow." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("workflow_enrollments")
    .select(
      "id, client_id, status, current_step, next_run_at, stopped_reason, enrolled_at, completed_at, clients(name)",
    )
    .eq("workflow_id", id)
    // Active first — those are the only ones anybody can act on. Then most
    // recent, so a sequence that just stopped is still visible next to them.
    .order("status", { ascending: true })
    .order("enrolled_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as {
    id: string;
    client_id: string;
    status: string;
    current_step: number;
    next_run_at: string | null;
    stopped_reason: string | null;
    enrolled_at: string;
    completed_at: string | null;
    clients: { name: string } | null;
  }[];

  const payload: EnrollmentsPayload = {
    enrollments: rows.map((row) => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.clients?.name ?? null,
      status: row.status,
      currentStep: row.current_step,
      nextRunAt: row.next_run_at,
      stoppedReason: row.stopped_reason,
      enrolledAt: row.enrolled_at,
      completedAt: row.completed_at,
    })),
  };
  return NextResponse.json(payload);
}

export interface StopEnrollmentResult {
  enrollmentId: string;
  /** Messages this enrolment had queued that were cancelled with it. */
  cancelledMessages: number;
}

export async function POST(
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
    enrollmentId?: string;
    reason?: string;
  } | null;

  if (!body?.enrollmentId) {
    return NextResponse.json(
      { error: "Which enrolment should stop?" },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();
  if (!(await ownedWorkflow(supabase, context.facilityId, id))) {
    return NextResponse.json({ error: "No such workflow." }, { status: 404 });
  }

  const { data, error } = await supabase.rpc("stop_workflow_enrollment", {
    p_enrollment_id: body.enrollmentId,
    p_reason: body.reason ?? undefined,
  });

  if (error) {
    // 22023 is the function's own "already ended" — a real answer, not a
    // failure, and the panel shows it as written.
    if (error.code === "22023") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return writeFailure(error, {
      denied: "Stopping a sequence needs permission to manage automations.",
      duplicate: "That sequence could not be stopped.",
    });
  }

  const row = ((data ?? []) as { cancelled_messages: number }[])[0];
  const result: StopEnrollmentResult = {
    enrollmentId: body.enrollmentId,
    cancelledMessages: Number(row?.cancelled_messages ?? 0),
  };
  return NextResponse.json(result);
}

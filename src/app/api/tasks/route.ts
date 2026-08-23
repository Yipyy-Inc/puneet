import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import {
  TASK_SELECT,
  toTaskRow,
  type TaskRecord,
  type TaskRow,
} from "@/lib/api/mappers/facility-task";
import { createServerClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/database";

// ============================================================================
// The task board.
//
// ── WHO SEES WHAT IS RLS'S ANSWER, NOT THIS FILE'S ────────────────────────
//
// `facility_tasks_read` admits whoever holds `ops_manage_tasks` to the whole
// facility, and everybody else to the tasks assigned to them. So one route
// serves the manager's board and a caretaker's own list, and neither can be
// widened by asking differently.
//
// ── EVERY QUERY PARAMETER IS A FILTER, NOT A GATE ─────────────────────────
//
// `assignedTo`, `status`, `source` and the date bounds all narrow an ALREADY
// narrowed set. Passing one shows a caller no more than RLS would have given
// them, and omitting one gains nothing — which is the only safe way to offer a
// convenience like this. In particular `assignedTo` is not how a person reaches
// their own list; it is how a manager filters the board they can already see.
// ============================================================================

export const dynamic = "force-dynamic";

export interface TasksPayload {
  tasks: TaskRow[];
  /** True when the page cap bit, so a screen can say the list is partial. */
  truncated: boolean;
}

const PAGE = 500;

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const params = new URL(request.url).searchParams;

  let query = supabase
    .from("facility_tasks")
    .select(TASK_SELECT)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(PAGE);

  const context = await getFacilityContext();
  if (context) query = query.eq("facility_id", context.facilityId);

  const status = params.get("status");
  if (status && status !== "all") query = query.eq("status", status);

  const source = params.get("source");
  if (source && source !== "all") query = query.eq("source", source);

  const assignedTo = params.get("assignedTo");
  if (assignedTo) query = query.eq("assigned_to", assignedTo);

  // Both ends, for the reason the loyalty ledger learned the hard way: a lower
  // bound alone cannot help when enough rows have accumulated on the recent
  // side of a newest-N cut.
  const since = params.get("since");
  if (since && !Number.isNaN(Date.parse(since))) {
    query = query.gte("due_at", new Date(since).toISOString());
  }
  const until = params.get("until");
  if (until && !Number.isNaN(Date.parse(until))) {
    query = query.lte("due_at", new Date(until).toISOString());
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as unknown as TaskRecord[];
  // One clock, on the server. `overdue` computed per browser is how the same
  // task is late for one person and not for their colleague.
  const now = new Date();

  const payload: TasksPayload = {
    tasks: rows.map((row) => toTaskRow(row, now)),
    truncated: rows.length === PAGE,
  };
  return NextResponse.json(payload);
}

export interface CreateTaskResult {
  task: TaskRow;
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
    title?: string;
    description?: string | null;
    category?: string;
    priority?: string;
    assignedTo?: string | null;
    dueAt?: string | null;
    estimatedMinutes?: number | null;
    requiresPhoto?: boolean;
    requiresSignoff?: boolean;
    notes?: string | null;
    source?: string;
    sourceRef?: string | null;
    templateId?: string | null;
    metadata?: Record<string, unknown>;
  } | null;

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json(
      { error: "A task needs a title." },
      { status: 400 },
    );
  }

  const PRIORITIES = ["low", "medium", "high", "urgent"];
  if (body?.priority && !PRIORITIES.includes(body.priority)) {
    return NextResponse.json(
      { error: `A priority is one of ${PRIORITIES.join(", ")}.` },
      { status: 400 },
    );
  }

  const SOURCES = [
    "manual",
    "call_follow_up",
    "reputation_escalation",
    "template",
  ];
  if (body?.source && !SOURCES.includes(body.source)) {
    return NextResponse.json(
      { error: `A source is one of ${SOURCES.join(", ")}.` },
      { status: 400 },
    );
  }

  // The FACILITY comes from the session, never the request. A task written
  // into somebody else's board would be work they never agreed to.
  const insert: TablesInsert<"facility_tasks"> = {
    facility_id: context.facilityId,
    title,
    description: body?.description ?? null,
    category: body?.category ?? "general",
    priority: body?.priority ?? "medium",
    assigned_to: body?.assignedTo ?? null,
    due_at: body?.dueAt ?? null,
    estimated_minutes: body?.estimatedMinutes ?? null,
    requires_photo: body?.requiresPhoto ?? false,
    requires_signoff: body?.requiresSignoff ?? false,
    notes: body?.notes ?? null,
    source: body?.source ?? "manual",
    source_ref: body?.sourceRef ?? null,
    template_id: body?.templateId ?? null,
    created_by: viewer.userId,
    ...(body?.metadata ? { metadata: body.metadata as never } : {}),
  };

  // `status` is deliberately absent. A task cannot arrive already finished —
  // the table refuses `completed` with no `completed_at`, and a caller naming
  // its own completion is a caller reporting work nobody did.

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("facility_tasks")
    .insert(insert)
    .select(TASK_SELECT)
    .maybeSingle();

  if (error) {
    // The dedup index. A second follow-up for the same call is not an error
    // the person needs to see as a failure — it means somebody else already
    // made it, which is the index doing its job.
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error: "There is already a task for that. Somebody got there first.",
        },
        { status: 409 },
      );
    }
    if (error.code === "42501") {
      return NextResponse.json(
        {
          error:
            "You can write yourself a task, but assigning work to somebody else needs permission to manage team tasks.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "You are not allowed to create that task." },
      { status: 403 },
    );
  }

  const result: CreateTaskResult = {
    task: toTaskRow(data as unknown as TaskRecord),
  };
  return NextResponse.json(result, { status: 201 });
}

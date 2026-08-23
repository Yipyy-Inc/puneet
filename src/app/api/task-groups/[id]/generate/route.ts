import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import {
  toTaskRow,
  type TaskRecord,
  type TaskRow,
} from "@/lib/api/mappers/facility-task";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Turning a group into today's work.
//
// ── THE STEP THE FIXTURE NEVER HAD ────────────────────────────────────────
//
// `shiftTaskGroups` and `positionTaskGroups` existed and generated nothing, so
// the two tabs listed sets of chores nobody was ever asked to do. This is the
// button that makes a group mean something.
//
// ── SAFE TO PRESS TWICE ───────────────────────────────────────────────────
//
// Each generated task carries `source_ref = '<group>:<date>:<chore>'` and
// `facility_tasks_source_unique` refuses a second one, so two people pressing
// it, or a scheduler retrying, creates nothing the second time. The response
// says how many were NEW, which is the number a person wants — "nothing to do,
// somebody already did this" is a different message from "created 6".
//
// ── AND NOT A WAY ROUND THE POLICIES ──────────────────────────────────────
//
// `generate_tasks_from_group` is SECURITY INVOKER. A definer would bypass RLS
// entirely here — `force row level security` does not stop one, because the
// owner is a superuser — so the caller's own permissions are what decide, and
// a person who could not create these tasks by hand cannot create them through
// this route either.
// ============================================================================

export const dynamic = "force-dynamic";

export interface GenerateTasksResult {
  /** The tasks this call actually created. Empty when they already existed. */
  created: TaskRow[];
  /** The date they were generated for, so a screen can say which day it meant. */
  forDate: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    forDate?: string;
    assignTo?: string | null;
  } | null;

  let forDate = body?.forDate;
  if (forDate && Number.isNaN(Date.parse(forDate))) {
    return NextResponse.json({ error: "That is not a date." }, { status: 400 });
  }
  if (!forDate) forDate = new Date().toISOString().slice(0, 10);

  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("generate_tasks_from_group", {
    p_group_id: id,
    p_for_date: forDate,
    p_assign_to: body?.assignTo ?? undefined,
  });

  if (error) {
    // 42501 is the function refusing a group the caller cannot see, which is
    // the same answer as one that does not exist — deliberately.
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "You are not allowed to generate that group's tasks." },
        { status: 403 },
      );
    }
    // 22023 is the function's own sentence about WHEN a group runs, and it is
    // written for a person: "That group does not run on that day of the week."
    if (error.code === "22023") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as unknown as TaskRecord[];
  // One clock for the whole batch, so two tasks generated in the same call
  // cannot disagree about whether they are overdue.
  const now = new Date();

  const result: GenerateTasksResult = {
    created: rows.map((row) => toTaskRow(row, now)),
    forDate,
  };
  return NextResponse.json(result);
}

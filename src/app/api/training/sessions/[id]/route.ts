import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import type { TablesUpdate } from "@/types/database";

// ============================================================================
// Mark a training session held — or put it back — and keep the trainer's
// preparation for it.
//
// Three things move, and nothing else can (authenticated holds UPDATE on
// these columns alone, and RLS admits check_in_out or
// training_manage_programs):
//
//   status                 20260911143447. The session view's "Complete
//                          session" changed the screen and nothing else, so a
//                          class that ran last week stayed "scheduled".
//   briefed                20260912170021. The pre-session briefing's "Mark
//                          briefed" was a cache entry: the reminder came back
//                          on reload and on every other device.
//   plannedExerciseIds     20260912170021. The exercises planned in the
//                          briefing, which the session view pre-loads.
// ============================================================================

export const dynamic = "force-dynamic";

const STATUSES = new Set(["scheduled", "completed", "cancelled"]);
const MAX_PLANNED = 50;
const DENIED = "Not allowed to change this session.";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    status?: string;
    briefed?: boolean;
    plannedExerciseIds?: unknown;
  } | null;
  if (
    !body ||
    (body.status === undefined &&
      body.briefed === undefined &&
      body.plannedExerciseIds === undefined)
  ) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }

  const update: TablesUpdate<"training_series_sessions"> = {};
  if (body.status !== undefined) {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: "A session is scheduled, completed or cancelled." },
        { status: 422 },
      );
    }
    update.status = body.status;
  }
  if (body.briefed !== undefined) {
    if (typeof body.briefed !== "boolean") {
      return NextResponse.json(
        { error: "briefed is true or false." },
        { status: 422 },
      );
    }
    const viewer = body.briefed ? await getViewer().catch(() => null) : null;
    update.briefed_at = body.briefed ? new Date().toISOString() : null;
    update.briefed_by_name = body.briefed
      ? (viewer?.fullName ?? viewer?.email ?? null)
      : null;
  }
  if (body.plannedExerciseIds !== undefined) {
    const ids = body.plannedExerciseIds;
    if (
      !Array.isArray(ids) ||
      ids.length > MAX_PLANNED ||
      !ids.every(
        (x) => typeof x === "string" && x.length > 0 && x.length <= 100,
      )
    ) {
      return NextResponse.json(
        { error: `A plan is up to ${MAX_PLANNED} exercise ids.` },
        { status: 422 },
      );
    }
    // In the order planned, each once.
    update.planned_exercise_ids = [...new Set(ids as string[])];
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("training_series_sessions")
    .update(update)
    .eq("id", id)
    .select("id, status, briefed_at, planned_exercise_ids");

  if (error) {
    return writeFailure(error, {
      denied: DENIED,
      duplicate: "That session is already marked.",
    });
  }
  const denied = deniedIfUntouched(data, DENIED);
  if (denied) return denied;

  return NextResponse.json(data?.[0] ?? null);
}

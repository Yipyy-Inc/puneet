import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  SUBMISSION_SELECT,
  toSubmissionRow,
  type SubmissionRecord,
  type SubmissionRow,
} from "@/lib/api/mappers/form";
import { createServerClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";

// ============================================================================
// Reading one submission, and reviewing it.
//
// ── REVIEWING MOVES THE STATUS, NEVER THE ANSWERS ─────────────────────────
//
// `answers` is not an accepted field here, and a request naming it would be
// refused by trigger anyway (`private.submitted_answers_are_final`). What
// somebody said is the record; staff mark it reviewed or flagged, and score it.
//
// The trigger also refuses reassigning `client_id` or re-dating `submitted_at`
// as part of a review, so "mark as reviewed" cannot be used to quietly move a
// submission onto a different customer.
// ============================================================================

export const dynamic = "force-dynamic";

export interface ReviewSubmissionResult {
  submission: SubmissionRow;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("form_submissions")
    .select(SUBMISSION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "No such submission." }, { status: 404 });
  }

  return NextResponse.json({
    submission: toSubmissionRow(data as unknown as SubmissionRecord),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    status?: string;
    score?: number | null;
    scoreOutcome?: string | null;
    scoreDetails?: Record<string, unknown> | null;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  // Typed against the table, so `answers` is not merely absent from this route
  // — naming it here would be a compile error.
  const patch: TablesUpdate<"form_submissions"> = {};

  if (body.status !== undefined) {
    const allowed = ["submitted", "reviewed", "flagged", "archived"];
    if (!allowed.includes(body.status)) {
      return NextResponse.json(
        {
          error: `A submission can be moved to ${allowed.join(", ")} — not '${body.status}'.`,
        },
        { status: 400 },
      );
    }
    patch.status = body.status;
  }

  if (body.score !== undefined) patch.score = body.score;
  if (body.scoreOutcome !== undefined) patch.score_outcome = body.scoreOutcome;
  if (body.scoreDetails !== undefined)
    patch.score_details = body.scoreDetails as never;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  const supabase = await createServerClient();

  // `.select()` so an RLS refusal is visible: an UPDATE that fails a `using`
  // policy affects zero rows and returns success.
  const { data, error } = await supabase
    .from("form_submissions")
    .update(patch)
    .eq("id", id)
    .select(SUBMISSION_SELECT);

  if (error) {
    // 42501 is both the RLS refusal and the trigger's own message. The trigger
    // writes for a person, so its sentence is the one to show.
    if (error.code === "42501") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const refused = deniedIfUntouched(
    data,
    "You are not allowed to review that submission.",
  );
  if (refused) return refused;

  const result: ReviewSubmissionResult = {
    submission: toSubmissionRow((data as unknown as SubmissionRecord[])[0]),
  };
  return NextResponse.json(result);
}

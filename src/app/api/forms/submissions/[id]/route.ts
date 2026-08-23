import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { resolvePetNames } from "@/lib/api/form-pets";
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
// The trigger also refuses re-dating `submitted_at` or swapping the version as
// part of a review, so "mark as reviewed" cannot be used to quietly rewrite
// what somebody was asked or when they answered.
//
// ── FILING AN UNATTACHED ONE UNDER A CUSTOMER ─────────────────────────────
//
// `clientRef` is the one exception, and it is one-way. Staff capture a form at
// the counter before the person has a record, so a submission can arrive with
// no client at all; those answers have to be fileable or they are landfill.
// What stays refused is a REASSIGNMENT — once filed, these answers cannot be
// moved onto a different customer, or un-filed so they could be.
//
// The ref is resolved HERE, against the session's own facility, and the id it
// finds is what reaches the database. A caller cannot name a client uuid.
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

  const record = data as unknown as SubmissionRecord;
  return NextResponse.json({
    submission: toSubmissionRow(
      record,
      await resolvePetNames(supabase, [record]),
    ),
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
    clientRef?: number;
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

  const supabase = await createServerClient();

  if (body.clientRef !== undefined) {
    const context = await getFacilityContext();
    if (!context) {
      return NextResponse.json(
        { error: "No facility in this session." },
        { status: 403 },
      );
    }

    // Scoped to the session's facility, so a ref belonging to somebody else
    // resolves to nothing rather than to their client.
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("facility_id", context.facilityId)
      .eq("ref", body.clientRef)
      .maybeSingle();

    if (!client) {
      return NextResponse.json(
        { error: "No such customer at this facility." },
        { status: 404 },
      );
    }
    patch.client_id = (client as { id: string }).id;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

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

  const updated = (data as unknown as SubmissionRecord[])[0];
  const result: ReviewSubmissionResult = {
    submission: toSubmissionRow(
      updated,
      await resolvePetNames(supabase, [updated]),
    ),
  };
  return NextResponse.json(result);
}

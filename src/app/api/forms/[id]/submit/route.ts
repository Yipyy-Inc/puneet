import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import {
  SUBMISSION_SELECT,
  toSubmissionRow,
  type SubmissionRecord,
  type SubmissionRow,
} from "@/lib/api/mappers/form";
import { createServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

// ============================================================================
// Somebody answering a form.
//
// ── IT IS FILED AGAINST A VERSION, RESOLVED HERE ──────────────────────────
//
// The caller names the FORM; this route resolves its newest PUBLISHED version
// and files the answers against that. The version id is not accepted from the
// request: a caller could otherwise file answers against an old or unpublished
// set of questions, and the pairing of question to answer is the only thing
// that makes a submission mean anything.
//
// That version can never change afterwards — `private.published_form_version_
// is_frozen` refuses it — so these answers stay readable against exactly the
// questions that produced them.
//
// ── AND THE ANSWERS ARE FINAL ONCE SENT ───────────────────────────────────
//
// `private.submitted_answers_are_final` refuses a rewrite of `answers` on
// anything past `draft`. Staff review by moving `status` and `score`; what the
// person said is not theirs to edit.
//
// ── SIGNED-IN CALLERS ONLY, DELIBERATELY ──────────────────────────────────
//
// `/forms/[slug]` is reachable signed-out and its "email verification" is a
// `sessionStorage` flag the browser sets for itself. Accepting a submission
// from an unauthenticated caller needs an anon-callable write path, which is
// the exact class this repo has repaired five times. So the customer portal and
// the front desk write here; the public anonymous page is unchanged and still
// stores nothing. A known gap, recorded rather than papered over.
// ============================================================================

export const dynamic = "force-dynamic";

export interface SubmitFormResult {
  submission: SubmissionRow;
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
    clientRef?: number | string;
    petRef?: number | string;
    bookingRef?: number | string;
    answers?: Record<string, unknown>;
    staffAssisted?: boolean;
  } | null;

  const answers = body?.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return NextResponse.json(
      { error: "A submission needs its answers." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  const { data: form } = await supabase
    .from("forms")
    .select("id, facility_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!form) {
    return NextResponse.json({ error: "No such form." }, { status: 404 });
  }

  const doc = form as unknown as Tables<"forms">;
  if (doc.status !== "published") {
    // An unpublished form is one nobody has decided to ask yet. Answers to it
    // would be answers to a draft.
    return NextResponse.json(
      { error: "That form is not published." },
      { status: 409 },
    );
  }

  // Newest PUBLISHED version. Not the newest overall — a draft in progress is
  // not what the person was shown.
  const { data: versionRow } = await supabase
    .from("form_versions")
    .select("id, version_number")
    .eq("form_id", doc.id)
    .not("published_at", "is", null)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!versionRow) {
    return NextResponse.json(
      { error: "That form has no published questions yet." },
      { status: 409 },
    );
  }

  // The customer, by the ref screens carry, resolved WITHIN the form's own
  // facility — refs are per-facility, so the same number names somebody else
  // elsewhere.
  let clientId: string | null = null;
  if (body?.clientRef !== undefined && body.clientRef !== null) {
    const ref = Number(body.clientRef);
    if (Number.isFinite(ref)) {
      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("facility_id", doc.facility_id)
        .eq("ref", ref)
        .maybeSingle();
      if (!client) {
        return NextResponse.json(
          { error: "No client with that number at this facility." },
          { status: 404 },
        );
      }
      clientId = (client as { id: string }).id;
    }
  }

  let petId: string | null = null;
  if (clientId && body?.petRef !== undefined && body.petRef !== null) {
    const ref = Number(body.petRef);
    if (Number.isFinite(ref)) {
      const { data: pet } = await supabase
        .from("pets")
        .select("id")
        .eq("client_id", clientId)
        .eq("ref", ref)
        .maybeSingle();
      // Descriptive, so a pet that does not resolve is left null rather than
      // refusing a submission the person has already filled in.
      petId = (pet as { id: string } | null)?.id ?? null;
    }
  }

  const { data: inserted, error } = await supabase
    .from("form_submissions")
    .insert({
      facility_id: doc.facility_id,
      form_id: doc.id,
      form_version_id: (versionRow as { id: string }).id,
      client_id: clientId,
      pet_id: petId,
      answers: answers as never,
      status: "submitted",
      staff_assisted: body?.staffAssisted ?? false,
      staff_assistant_id: body?.staffAssisted ? viewer.userId : null,
      submitted_by: viewer.userId,
    })
    .select(SUBMISSION_SELECT)
    .single();

  if (error) {
    const denied = error.code === "42501";
    return NextResponse.json(
      {
        error: denied
          ? "You are not allowed to file a submission for that customer."
          : error.message,
      },
      { status: denied ? 403 : 400 },
    );
  }

  const result: SubmitFormResult = {
    submission: toSubmissionRow(inserted as unknown as SubmissionRecord),
  };
  return NextResponse.json(result, { status: 201 });
}

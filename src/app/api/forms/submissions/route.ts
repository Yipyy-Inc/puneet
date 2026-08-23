import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { resolvePetNames } from "@/lib/api/form-pets";
import { getViewer } from "@/lib/auth/viewer";
import {
  SUBMISSION_SELECT,
  toSubmissionRow,
  type SubmissionRecord,
  type SubmissionRow,
} from "@/lib/api/mappers/form";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// What people have answered.
//
// One route for both readers, because RLS already tells them apart:
// `form_submissions_read` admits staff with `view_client_documents` — every
// front-of-house role, since "has this been filled in?" is a check-in question
// — or the CUSTOMER whose answers they are.
//
// Each row carries the SCHEMA OF THE VERSION IT WAS FILLED AGAINST, not the
// form's current questions. That is the whole point of the shape: rendering
// today's questions beside last year's answers is how a "yes" ends up under a
// question nobody was asked.
// ============================================================================

export const dynamic = "force-dynamic";

export interface SubmissionsPayload {
  submissions: SubmissionRow[];
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
    .from("form_submissions")
    .select(SUBMISSION_SELECT)
    .order("submitted_at", { ascending: false })
    .limit(PAGE);

  // Narrowing to one facility is for the FACILITY's log. A customer has no
  // facility context of their own, so `mine=1` skips it and RLS narrows to
  // their own answers instead.
  const context = await getFacilityContext();
  if (context && params.get("mine") !== "1") {
    query = query.eq("facility_id", context.facilityId);
  }

  const formId = params.get("formId");
  if (formId) query = query.eq("form_id", formId);

  const status = params.get("status");
  if (status && status !== "all") query = query.eq("status", status);

  // Both ends, not just `since`. The loyalty ledger had a lower bound alone and
  // it could not help: the newest-N cut still sliced the row being looked for
  // whenever enough had accumulated on the recent side of it.
  const since = params.get("since");
  if (since && !Number.isNaN(Date.parse(since))) {
    query = query.gte("submitted_at", new Date(since).toISOString());
  }

  const until = params.get("until");
  if (until && !Number.isNaN(Date.parse(until))) {
    query = query.lte("submitted_at", new Date(until).toISOString());
  }

  const clientRef = params.get("clientRef");
  if (clientRef && context) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("facility_id", context.facilityId)
      .eq("ref", Number(clientRef))
      .maybeSingle();
    // A ref nobody has is an empty list, not an error.
    if (!client) {
      return NextResponse.json({ submissions: [], truncated: false });
    }
    query = query.eq("client_id", (client as { id: string }).id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as unknown as SubmissionRecord[];

  // A second query rather than an embed: `pet_id` carries no FK on purpose, and
  // asking PostgREST to embed it fails the whole select.
  const petNames = await resolvePetNames(supabase, rows);

  // Reported rather than left to be inferred. A list silently cut at an
  // arbitrary row invites somebody to conclude the earlier ones do not exist —
  // the same defect the loyalty ledger had until 2026-08-23.
  const payload: SubmissionsPayload = {
    submissions: rows.map((row) => toSubmissionRow(row, petNames)),
    truncated: rows.length === PAGE,
  };

  return NextResponse.json(payload);
}

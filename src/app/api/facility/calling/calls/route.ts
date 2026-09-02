import { NextResponse } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The calls a facility actually has.
//
// The Calling module reads `src/data/communications-hub.ts` —
// hand-authored rows with names, outcomes, sentiment scores and QA ratings for
// calls nobody ever placed. This is the route that replaces it.
//
// ── IT WILL RETURN AN EMPTY LIST, AND THAT IS THE POINT ───────────────────
//
// `call_record` is populated by the webhooks, which resolve a facility from
// `communication_numbers`, which provisioning fills and which is empty. So
// until a facility owns a number this answers `{ calls: [] }`.
//
// An empty list is a true statement about a facility that has never had a call
// through this platform. The fixture's twenty is not.
//
// ── NO FACILITY ID FROM THE REQUEST ───────────────────────────────────────
//
// `getFacilityContext()` resolves it from the caller's membership, and RLS
// scopes the rows again from the JWT — `call_record_read` requires
// `calling_view`. A caller who asks for another facility's calls gets their
// own, because there is no parameter to ask with. See
// `check:facility-from-session`.
//
// ── A QA SCORE IS AN ASSESSMENT OF A COLLEAGUE ────────────────────────────
//
// `call_record_read` requires `calling_view`, and reception and shift leads
// both hold it by default. `qa_score` is a manager's rating OF the person who
// took the call, sitting on the same row as the call itself — so the policy
// that lets a receptionist see the call also handed them every colleague's
// score.
//
// The screen did gate it, with `getFacilityRole() === "owner" | "manager"` —
// a cookie the browser can write, which returns "owner" when absent. But the
// number was in the response either way, and, as
// tests/e2e/staff-field-exposure.spec.ts says of the same defect in
// /api/staff: a hidden tab is not a control.
//
// So it is dropped HERE, keyed on `view_staff_performance` — the catalogue
// key for exactly this question, already gating the performance section of a
// staff profile. Null rather than zero: a zero is a bad score, not an absent
// one.
//
// ── RECORDINGS ARE NOT JOINED IN ──────────────────────────────────────────
//
// `calling_view_recordings` is a separate permission and `call_recording` is a
// separate table for exactly that reason. Joining it here would hand every
// caller with `calling_view` a recording url in the same payload, and the
// component would be the only thing standing between a groomer and it. The
// recordings route asks its own question.
// ============================================================================

export const dynamic = "force-dynamic";

const CALL_SELECT = `
  id, provider_call_sid, direction, from_number, to_number,
  status, started_at, answered_at, ended_at, duration_s,
  client_id, client_match, handled_by, location_id,
  notes, tags, follow_up_status, qa_score, booking_id, attribution_source
`;

export async function GET(request: Request) {
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const limit = Math.min(Number(params.get("limit") ?? 200) || 200, 500);

  const canSeeQa = holds(await myPermissions(), "view_staff_performance");

  const supabase = await createServerClient();
  let query = supabase
    .from("call_record")
    .select(CALL_SELECT)
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  // Filters are additive and optional. Absent means "everything the caller may
  // see", which RLS has already decided.
  const status = params.get("status");
  if (status && status !== "all") query = query.eq("status", status);

  const followUp = params.get("followUp");
  if (followUp === "open") query = query.eq("follow_up_status", "pending");

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Redacted after the query, not by omitting the column: the select is one
  // string shared with nothing, and a caller who may see the score and one who
  // may not must get the same rows, differing in one field.
  const calls = (data ?? []).map((row) =>
    canSeeQa ? row : { ...row, qa_score: null },
  );

  return NextResponse.json({
    calls,
    // So a screen can tell "no calls yet" from "no calls matching that filter",
    // which read the same on the fixture-backed version and meant different
    // things.
    filtered: Boolean((status && status !== "all") || followUp),
  });
}

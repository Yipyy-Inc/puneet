import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { holds, myPermissions } from "@/lib/auth/permissions";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The Requests tab: who was asked, what happened, and who was NOT asked.
//
// ── THE SUPPRESSED ONES ARE THE POINT ─────────────────────────────────────
//
// "Why did only 312 of 480 check-outs get asked" is a question the previous
// build could not answer at all, because a request that was refused simply did
// not exist. Here a refusal is a row with a named reason, and `state=suppressed`
// is a filter like any other. That is most of the value of this screen.
//
// ── THE TRAIL IS TWO QUERIES, AND IT HAS TO BE ────────────────────────────
//
// There is no `review_request_step` table and no state-event log. What was
// sent, when, on which channel and whether it was skipped are `message_sends`
// rows keyed by `source_id`; whether it was answered is the response.
//
// The response EMBEDS. The sends CANNOT: `message_sends.source_id` has no
// foreign key and deliberately never will, because a rule, a workflow and a
// review request all live in that one column and it can only point at one
// table. PostgREST needs a relationship to embed, so it answers "could not find
// a relationship between review_requests and message_sends in the schema
// cache" — measured, not assumed, before this shipped.
//
// So the sends are fetched once for the whole page and merged here. Two
// queries, not fifty.
//
// `!left` on the response is load-bearing. The default embed is an inner join
// and would silently drop every unanswered request — which is most of them, and
// exactly the ones a facility needs to look at.
//
// ── NO TOKENS LEAVE THIS ROUTE ────────────────────────────────────────────
//
// `token_hash` is not in the select list, and the plaintext exists nowhere to
// select. A member of staff must not be able to open a customer's survey and
// answer it for them, which is what a "copy survey link" button would allow.
// ============================================================================

export const dynamic = "force-dynamic";

const PAGE = 50;

const SELECT = `
  id, business_day, state, state_changed_at, service_types, booking_ids,
  channel, source, suppress_reason, suppress_stage, next_eligible_at,
  first_send_at, expires_at, nudge_outcome, nudge_due_at, created_at,
  escalation_threshold, showcase_min,
  client:clients!inner(id, ref, name, email, phone),
  staff:staff(id, first_name, last_name),
  response:review_responses!left(
    id, rating, comment, source, submitted_at, moderation_state,
    display_consent, public_clicked_at,
    staff:staff(id, first_name, last_name)
  )
`;

/** What the trail shows per step. No token, and no address. */
const SEND_SELECT =
  "id, source_id, channel, status, skip_reason, scheduled_for, sent_at, " +
  "step_index, subject_rendered, body_rendered, provider, last_error";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!holds(await myPermissions(), "marketing_manage_reviews")) {
    return NextResponse.json(
      { error: "You do not have permission to see review requests." },
      { status: 403 },
    );
  }

  const facility = await getFacilityContext().catch(() => null);
  if (!facility) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  const params = request.nextUrl.searchParams;
  const supabase = await createServerClient();

  let query = supabase
    .from("review_requests")
    .select(SELECT)
    .eq("facility_id", facility.facilityId)
    .order("created_at", { ascending: false })
    .limit(PAGE);

  // The tab's filter chips. Absent means everything, and "everything" includes
  // the suppressed — hiding them by default would rebuild the blind spot this
  // screen exists to remove.
  const state = params.get("state");
  if (state) query = query.eq("state", state);

  const from = params.get("from");
  const to = params.get("to");
  if (from) query = query.gte("created_at", `${from}T00:00:00Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59Z`);

  const locationIds = params.getAll("location").filter(Boolean);
  if (locationIds.length > 0) query = query.in("location_id", locationIds);

  const before = params.get("before");
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as { id: string; created_at: string }[];

  // The second query, for the reason in the header. Scoped to the ids on this
  // page and to this source kind, so a workflow enrolment that happens to share
  // a uuid shape cannot appear in a review request's trail.
  const sendsByRequest = new Map<string, unknown[]>();
  if (rows.length > 0) {
    const { data: sends } = await supabase
      .from("message_sends")
      .select(SEND_SELECT)
      .eq("source_kind", "review_request")
      .in(
        "source_id",
        rows.map((row) => row.id),
      )
      .order("step_index", { ascending: true });

    for (const send of (sends ?? []) as unknown as { source_id: string }[]) {
      const list = sendsByRequest.get(send.source_id) ?? [];
      list.push(send);
      sendsByRequest.set(send.source_id, list);
    }
  }

  return NextResponse.json({
    requests: rows.map((row) => ({
      ...row,
      sends: sendsByRequest.get(row.id) ?? [],
    })),
    // A cursor rather than an offset: rows are inserted constantly and an
    // offset page 2 would skip whatever arrived in between.
    nextBefore: rows.length === PAGE ? rows[rows.length - 1].created_at : null,
  });
}

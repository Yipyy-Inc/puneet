import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { resolveTemplate, UNRESOLVED_TAG } from "@/lib/messaging/render";
import { loadMessageContext } from "@/lib/messaging/dispatch";
import { facilityCustomerOrigin } from "@/lib/app-host";
import { loadReputationConfig } from "@/lib/reputation/schedule";
import {
  mintReviewToken,
  reviewLinkFor,
  toByteaLiteral,
} from "@/lib/reputation/token";

// ============================================================================
// One nudge per request. Ever.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// Two independent reminder systems that both fired at 48 hours into a "one per
// day" cap: a "backup step" on the send sequence, and a "happy but silent"
// smart reminder. Nothing said which won, so the honest answer was "whichever
// ran first", and a client who rated five stars and did not click could receive
// both.
//
// They are not two systems reconciled by a precedence rule. They are two
// BRANCHES OF ONE EVALUATION, and the budget is spent by the claim rather than
// by the branch — so whichever branch fires, and even if none does, the request
// is finished being nudged.
//
// ── THE CLAIM IS THE BUDGET ───────────────────────────────────────────────
//
// `nudge_resolved_at is null -> now()`, conditional, returning the rows it
// changed. The same shape as `queued -> sending` in the outbox and
// `processed_at is null` on an event. Two overlapping ticks cannot both nudge,
// and a counter column would be a number free to disagree with the outbox.
//
// ── AND A LATE NUDGE IS NOT SENT AT ALL ───────────────────────────────────
//
// A worker outage backs the queue up. When it drains, a "gentle nudge" about a
// visit nine weeks ago is not a reminder, it is a curiosity — the build this
// replaces sent one 49 days after its request. Past the request's own
// `expires_at`, the branch is `expired` and nothing is queued.
// ============================================================================

const TICK_BATCH = 50;

export interface NudgeResult {
  evaluated: number;
  queued: number;
  expired: number;
  none: number;
  problems: string[];
}

const EMPTY: NudgeResult = {
  evaluated: 0,
  queued: 0,
  expired: 0,
  none: 0,
  problems: [],
};

interface DueRow {
  id: string;
  facility_id: string;
  location_id: string | null;
  client_id: string;
  business_day: string;
  state: string;
  channel: string | null;
  expires_at: string;
  nudge_due_at: string;
  escalation_threshold: number;
  booking_ids: string[];
}

/**
 * Resolve every request whose nudge has come due.
 *
 * Called from the messaging tick BETWEEN `advanceDueEnrollments()` and
 * `sendDueMessages()`, so anything queued here goes out on the same tick rather
 * than waiting five more minutes.
 */
export async function evaluateDueReviewNudges(): Promise<NudgeResult> {
  if (!hasServiceRoleKey()) {
    return { ...EMPTY, problems: ["no service-role key; no nudges evaluated"] };
  }
  const db = createAdminClient();
  const result: NudgeResult = { ...EMPTY, problems: [] };

  const { data: due, error } = await db
    .from("review_requests")
    .select(
      "id, facility_id, location_id, client_id, business_day, state, channel, expires_at, nudge_due_at, escalation_threshold, booking_ids",
    )
    .lte("nudge_due_at", new Date().toISOString())
    .is("nudge_resolved_at", null)
    .order("nudge_due_at", { ascending: true })
    .limit(TICK_BATCH);

  if (error) {
    return {
      ...EMPTY,
      problems: [`could not read due nudges: ${error.message}`],
    };
  }

  for (const row of (due ?? []) as DueRow[]) {
    try {
      await resolveOne(db, row, result);
    } catch (failure) {
      // Never throw out of the tick: one bad request must not strand the other
      // forty-nine with their budget already spent and nothing sent.
      const detail = failure instanceof Error ? failure.message : "unknown";
      result.problems.push(`nudge ${row.id}: ${detail}`);
    }
  }

  return result;
}

async function resolveOne(
  db: ReturnType<typeof createAdminClient>,
  row: DueRow,
  result: NudgeResult,
): Promise<void> {
  // ── The claim ────────────────────────────────────────────────────────────
  //
  // Spend the budget BEFORE deciding what to do with it. A second tick reading
  // the same row changes nothing and moves on, and a crash between here and the
  // queue costs one nudge rather than risking two.
  //
  // IT CLAIMS WITH AN OUTCOME OF 'none', WHICH IS NOT DECORATIVE.
  // `review_requests_nudge_outcome_needs_resolution` requires the timestamp and
  // the outcome to appear together, so a claim that set only the timestamp
  // raises 23514 — and the first version of this file did exactly that, then
  // ignored the error because it destructured only `data`. Every claim failed,
  // `evaluated` stayed 0, and the tick reported a clean run having done
  // nothing. Two bugs at once, and the constraint was right both times.
  //
  // 'none' is also the correct thing to be left with if this process dies in
  // the next few lines: nothing was sent, and that is what the row now says.
  const { data: claimed, error: claimError } = await db
    .from("review_requests")
    .update({
      nudge_resolved_at: new Date().toISOString(),
      nudge_outcome: "none",
    } as never)
    .eq("id", row.id)
    .is("nudge_resolved_at", null)
    .select("id");

  if (claimError) {
    // Never swallow this again. A claim that cannot be written is the whole
    // mechanism failing, and it must not look like a quiet tick.
    result.problems.push(
      `nudge ${row.id}: claim failed: ${claimError.message}`,
    );
    return;
  }
  if (!claimed || claimed.length === 0) return;
  result.evaluated += 1;

  const now = new Date();

  // ── Branch 1: too late to be worth sending ──────────────────────────────
  if (now > new Date(row.expires_at)) {
    await outcome(db, row.id, "expired");
    result.expired += 1;
    return;
  }

  // ── What happened since the ask ─────────────────────────────────────────
  const { data: response } = await db
    .from("review_responses")
    .select("rating, public_clicked_at")
    .eq("request_id", row.id)
    .maybeSingle();

  const answered = response as {
    rating: number;
    public_clicked_at: string | null;
  } | null;

  // ── Branch 2: rated, above the threshold, never clicked ─────────────────
  //
  // The "share it publicly" nudge. Only above the escalation threshold: asking
  // somebody who rated two stars to post it publicly would be tone-deaf, and
  // they have a recovery ticket open about them.
  if (answered) {
    const shareable =
      answered.rating > row.escalation_threshold &&
      answered.public_clicked_at === null;

    if (!shareable) {
      await outcome(db, row.id, "none");
      result.none += 1;
      return;
    }
    await queueNudge(db, row, "review_nudge", result);
    return;
  }

  // ── Branch 3: never answered ────────────────────────────────────────────
  //
  // The backup send. Only from a state that means the ask actually went out —
  // a suppressed or failed request has nothing to follow up.
  if (row.state === "sent" || row.state === "delivered") {
    await queueNudge(db, row, "review_request", result);
    return;
  }

  await outcome(db, row.id, "none");
  result.none += 1;
}

/**
 * Queue the nudge on the OTHER channel where there is one.
 *
 * An email that went unanswered is not more likely to be answered by a second
 * email. Falling back to the same channel when there is no alternative is still
 * worth doing — it is one message, and the budget is already spent.
 */
async function queueNudge(
  db: ReturnType<typeof createAdminClient>,
  row: DueRow,
  templateKey: "review_request" | "review_nudge",
  result: NudgeResult,
): Promise<void> {
  const context = await loadMessageContext(db, {
    facility_id: row.facility_id,
    client_id: row.client_id,
    booking_id: row.booking_ids[0] ?? null,
    location_id: row.location_id,
  });
  if (!context) {
    await outcome(db, row.id, "none");
    result.none += 1;
    return;
  }

  const other = row.channel === "email" ? "sms" : "email";
  const channel: "email" | "sms" =
    other === "sms" && context.phone
      ? "sms"
      : other === "email" && context.email
        ? "email"
        : context.email
          ? "email"
          : "sms";

  const to = channel === "email" ? context.email : context.phone;
  if (!to) {
    await outcome(db, row.id, "none");
    result.none += 1;
    return;
  }

  const key = channel === "sms" ? `${templateKey}_sms` : templateKey;
  const { data: template } = await db
    .from("message_templates")
    .select("id, subject, body, is_active")
    .eq("facility_id", row.facility_id)
    .eq("key", key)
    .maybeSingle();

  const t = template as {
    id: string;
    subject: string | null;
    body: string;
    is_active: boolean;
  } | null;
  if (!t || !t.is_active) {
    result.problems.push(`nudge ${row.id}: template ${key} missing or retired`);
    await outcome(db, row.id, "none");
    result.none += 1;
    return;
  }

  // ── A FRESH TOKEN, AND THE OLD ONE STOPS WORKING ────────────────────────
  //
  // `token_hash` is unique and the column holds one value, so writing a new one
  // retires the link in the first message. That is the right way round: the
  // nudge is the live invitation, and a customer who kept both should not find
  // that the older text works and the newer does not.
  const config = await loadReputationConfig(db, row.facility_id);
  const { token, hash } = mintReviewToken();

  const { data: facility } = await db
    .from("facilities")
    .select("slug")
    .eq("id", row.facility_id)
    .maybeSingle();
  const slug = (facility as { slug: string | null } | null)?.slug;
  const origin = slug
    ? facilityCustomerOrigin(slug, process.env.NEXT_PUBLIC_APP_DOMAIN)
    : null;
  if (!origin) {
    result.problems.push(`nudge ${row.id}: facility has no slug, so no link`);
    await outcome(db, row.id, "none");
    result.none += 1;
    return;
  }

  await db
    .from("review_requests")
    .update({
      token_hash: toByteaLiteral(hash),
      token_expires_at: new Date(
        Date.now() + config.linkTtlDays * 86_400_000,
      ).toISOString(),
    } as never)
    .eq("id", row.id);

  const data = {
    ...context.data,
    links: {
      ...(context.data.links ?? {}),
      survey: reviewLinkFor(origin, token),
    },
  };
  const subject = t.subject ? resolveTemplate(t.subject, data) : null;
  const body = resolveTemplate(t.body, data);

  if (UNRESOLVED_TAG.test(body) || (subject && UNRESOLVED_TAG.test(subject))) {
    result.problems.push(`nudge ${row.id}: unresolved variable, not queued`);
    await outcome(db, row.id, "none");
    result.none += 1;
    return;
  }

  const { error: insertError } = await db.from("message_sends").insert({
    facility_id: row.facility_id,
    location_id: row.location_id,
    client_id: row.client_id,
    channel,
    to_address: to,
    source_kind: "review_request",
    source_id: row.id,
    // step 1 is the nudge. The unique idempotency key on (source, step) is what
    // actually makes "one nudge, ever" true under concurrency; the claim above
    // is the readable record of it.
    step_index: 1,
    template_id: t.id,
    subject_rendered: subject,
    body_rendered: body,
    status: "queued",
    scheduled_for: new Date().toISOString(),
    idempotency_key: `review_request:${row.id}:1:${row.client_id}:${channel}:${row.business_day}`,
    provider: channel === "email" ? "resend" : "twilio",
  } as never);

  if (insertError && insertError.code !== "23505") {
    result.problems.push(`nudge ${row.id}: ${insertError.message}`);
    await outcome(db, row.id, "none");
    result.none += 1;
    return;
  }

  await outcome(
    db,
    row.id,
    templateKey === "review_nudge" ? "share" : "backup",
  );
  result.queued += 1;
}

/**
 * Refine the provisional outcome the claim wrote.
 *
 * The row is already resolved with 'none' by the time this runs, so this only
 * ever narrows "nothing happened" to what actually did. It cannot un-resolve a
 * request, which is what keeps the budget spent.
 */
async function outcome(
  db: ReturnType<typeof createAdminClient>,
  requestId: string,
  value: "backup" | "share" | "none" | "expired",
): Promise<void> {
  await db
    .from("review_requests")
    .update({ nudge_outcome: value } as never)
    .eq("id", requestId);
}

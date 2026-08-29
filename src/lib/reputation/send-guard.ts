import "server-only";

import { reviewRequestEligibility } from "@/lib/reputation/eligibility";
import { loadReputationConfig } from "@/lib/reputation/schedule";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Is this review request still one we should send?
//
// ── THE RUNG THE SEND PATH WAS MISSING ────────────────────────────────────
//
// `sendOneQueued` re-runs the UNIVERSAL ladder before every message: expiry,
// quiet hours, the velocity cap, consent, a configured channel. Those apply to
// everything the product sends. Booking health does not — nothing else asks
// "was this visit refunded" — so it lived only in the scheduler, and the send
// path had no idea a review request was different from a birthday email.
//
// Which made this comment, in eligibility.ts, false:
//
//     "Booking health is checked at scheduling AND the ladder is re-run at
//      send time, because a refund can be opened inside the delay window —
//      which is the entire reason the delay exists."
//
// The delay is the whole point. A check-out at 16:00 asks at 17:00, and the
// hour in between is exactly when somebody notices a cut on a dog's ear, opens
// a refund, or realises they checked out the wrong booking and reverses it.
// Every one of those was, until now, followed by "How was your visit?".
//
// `suppress_stage` has allowed 'send' since the table was created and nothing
// could ever produce it — the same shape of dead value as
// `message_suppressions.reason = 'sms_stop'` before an inbound webhook existed.
//
// ── AND THE REFUSAL IS STILL A ROW ────────────────────────────────────────
//
// Same rule as the scheduler: a request that was not sent says why, so "why
// did only 312 of 480 check-outs get asked" stays answerable. The request is
// moved to `suppressed` with the stage set to 'send', which is what
// distinguishes "we never asked" from "we were going to and then something
// changed".
// ============================================================================

export interface SendGuardVerdict {
  /** The suppression reason, or null when the request is still askable. */
  reason: string | null;
}

const ASKABLE: SendGuardVerdict = { reason: null };

/**
 * Re-run booking health for a queued review request.
 *
 * Best effort by design: a request row that cannot be read must not strand the
 * message in `sending`, and the universal rungs have already run. Failing OPEN
 * here matches the scheduler, which also treats an unreadable booking as no
 * evidence of a problem rather than as a problem.
 */
export async function reviewRequestStillAskable(
  db: SupabaseClient,
  requestId: string,
): Promise<SendGuardVerdict> {
  const { data } = await db
    .from("review_requests")
    .select("id, facility_id, client_id, booking_ids, state")
    .eq("id", requestId)
    .maybeSingle();

  const request = data as {
    id: string;
    facility_id: string;
    client_id: string;
    booking_ids: string[] | null;
    state: string;
  } | null;

  if (!request) return ASKABLE;

  // Somebody already suppressed or cancelled it between queueing and now —
  // through the Requests tab, or a second tick. Do not send, and do not
  // overwrite the reason they recorded.
  if (request.state === "suppressed" || request.state === "cancelled") {
    return { reason: "already_resolved" };
  }

  const config = await loadReputationConfig(db, request.facility_id);
  const verdict = await reviewRequestEligibility(db, {
    facilityId: request.facility_id,
    clientId: request.client_id,
    bookingIds: request.booking_ids ?? [],
    config,
    // Without this the recency rung finds THIS request and suppresses it for
    // cooldown — every request, every time. Proven by running the guard against
    // a healthy booking and watching it refuse.
    excludeRequestId: request.id,
  });

  if (verdict.eligible) return ASKABLE;

  await db
    .from("review_requests")
    .update({
      state: "suppressed",
      suppress_reason: verdict.reason,
      // The column has allowed this since the table existed. This is the first
      // thing that can write it.
      suppress_stage: "send",
      suppressed_at: new Date().toISOString(),
      next_eligible_at: verdict.nextEligibleAt?.toISOString() ?? null,
      // A request that is not going out has no nudge due. Leaving this set
      // would have the evaluator come back for it in 48 hours.
      nudge_due_at: null,
    } as never)
    .eq("id", request.id);

  return { reason: verdict.reason };
}

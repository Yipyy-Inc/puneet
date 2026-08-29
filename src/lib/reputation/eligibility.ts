import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  nextEligibleAt,
  type ReputationConfig,
} from "@/lib/settings/reputation";

// ============================================================================
// Whether this client may be asked for a review about this visit.
//
// ── THE RUNGS THAT ARE HERE, AND THE ONES THAT ARE NOT ────────────────────
//
// The spec's guardrail ladder has seven rungs. Four of them belong to EVERY
// message a facility sends and are already in `deliver()` and
// `sendDueMessages()` — consent, contactability, quiet hours and the velocity
// cap. Duplicating them here would create a second place to forget that
// somebody has unsubscribed, and under CASL that is not a bug you get to have
// twice.
//
// What is left is the part nothing else asks: is this VISIT one we should be
// drawing attention to, and have we asked this person too recently. That is
// this file.
//
// ── WHY IT RUNS BEFORE THE ROW IS WRITTEN, NOT INSTEAD OF THE ROW ─────────
//
// A refusal still writes a `review_requests` row, with `state = 'suppressed'`
// and a named reason. "Why did only 312 of 480 check-outs get asked" is a
// question the previous build could not answer at all, and a scheduler that
// simply returned early would leave it that way. The row IS the answer.
//
// ── ASKING FOR A REVIEW AFTER A BAD VISIT ─────────────────────────────────
//
// The single most damaging thing this feature can do is ask for a review from
// somebody whose pet was just injured, or whose booking was refunded an hour
// ago. Booking health is checked at scheduling AND the ladder is re-run at send
// time, because a refund can be opened inside the delay window — which is the
// entire reason the delay exists.
// ============================================================================

/** Named so a screen can group suppressions and a person can act on them. */
export type SuppressReason =
  | "cancelled"
  | "refund_open"
  | "dispute"
  | "cooldown"
  | "negative_pause"
  | "manual_hold"
  | "no_channel";

export interface EligibilityVerdict {
  eligible: boolean;
  reason: SuppressReason | null;
  /** When they could be asked again, for the client profile to show. */
  nextEligibleAt: Date | null;
}

const ELIGIBLE: EligibilityVerdict = {
  eligible: true,
  reason: null,
  nextEligibleAt: null,
};

/**
 * Statuses that mean the visit did not happen, or did not end well.
 *
 * `no_show` is here for the obvious reason. `cancelled` is here because a
 * cancelled booking that somehow reached check-out is a data problem, and
 * asking its owner for a review would advertise it.
 */
const UNASKABLE_STATUSES = new Set(["cancelled", "no_show", "declined"]);

export async function reviewRequestEligibility(
  db: SupabaseClient,
  input: {
    facilityId: string;
    clientId: string;
    bookingIds: string[];
    config: ReputationConfig;
    now?: Date;
  },
): Promise<EligibilityVerdict> {
  const now = input.now ?? new Date();

  // ── Rung 3: booking health ───────────────────────────────────────────────
  if (input.bookingIds.length > 0) {
    const { data: bookings } = await db
      .from("bookings")
      .select("id, status, payment_status")
      .in("id", input.bookingIds);

    const rows = (bookings ?? []) as {
      status: string;
      payment_status: string;
    }[];

    if (rows.some((b) => UNASKABLE_STATUSES.has(b.status))) {
      return { eligible: false, reason: "cancelled", nextEligibleAt: null };
    }
    // A refund is the clearest possible signal that this visit is not one to
    // celebrate. It is read from the booking rather than from `payments`
    // because a partial refund still sets it, and a partially refunded visit
    // is exactly the ambiguous case we should not be asking about.
    if (rows.some((b) => b.payment_status === "refunded")) {
      return { eligible: false, reason: "refund_open", nextEligibleAt: null };
    }
  }

  // ── Rung 4: recency, as a union rather than a ranking ────────────────────
  //
  // Two windows with no stated precedence is how somebody who complained on
  // Monday gets asked again on Friday. `nextEligibleAt` takes the later of the
  // two, and the same date is what the client profile shows.
  const [{ data: lastAsk }, { data: lastNegative }] = await Promise.all([
    db
      .from("review_requests")
      .select("created_at")
      .eq("facility_id", input.facilityId)
      .eq("client_id", input.clientId)
      .neq("state", "suppressed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("review_responses")
      .select("submitted_at, rating, review_requests!inner(client_id)")
      .eq("facility_id", input.facilityId)
      .eq("review_requests.client_id", input.clientId)
      .lte("rating", input.config.escalationThreshold)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const askedAt = (lastAsk as { created_at: string } | null)?.created_at;
  const negativeAt = (lastNegative as { submitted_at: string } | null)
    ?.submitted_at;

  const until = nextEligibleAt(input.config, {
    lastAskedAt: askedAt ? new Date(askedAt) : null,
    lastNegativeAt: negativeAt ? new Date(negativeAt) : null,
  });

  if (until && until > now) {
    // Which window is doing the blocking, so the suppression list is readable.
    // If a negative pause is in force it is the more informative reason, even
    // when the cooldown would also have caught them.
    const negativeBlocks =
      negativeAt !== undefined &&
      input.config.negativePauseDays > 0 &&
      new Date(negativeAt).getTime() +
        input.config.negativePauseDays * 86_400_000 >
        now.getTime();

    return {
      eligible: false,
      reason: negativeBlocks ? "negative_pause" : "cooldown",
      nextEligibleAt: until,
    };
  }

  return { ...ELIGIBLE, nextEligibleAt: until };
}

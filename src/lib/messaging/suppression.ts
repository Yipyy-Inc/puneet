import "server-only";

import { normaliseAddress } from "@/lib/messaging/send";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// Has this person told us to stop?
//
// ── ONE CHECK, IN ONE PLACE, KEYED THE WAY THE SENDER KEYS ────────────────
//
// Under CASL a withdrawal attaches to the electronic ADDRESS, not to our row
// for a person — so it must survive staff creating a second client record with
// the same email, or deleting and recreating the first. `message_suppressions`
// is keyed `(facility_id, channel, address)` for that reason, and this module
// normalises the address with `normaliseAddress()` from the sender before
// looking it up.
//
// That shared normaliser is the whole point. A suppression stored as
// "+15145551234" and a send attempted against "5145551234" are the same person
// and a naive lookup finds nothing — which is not a missed feature, it is
// messaging somebody who told you not to.
//
// ── TRANSACTIONAL MAIL IS NOT SUPPRESSED BY A MARKETING OPT-OUT ───────────
//
// A booking confirmation confirms something the customer asked for. Someone who
// unsubscribes from win-back campaigns must still be told their dog is booked
// in — stopping that would be both a failure in the other direction and simply
// rude. `scope: 'marketing'` suppressions therefore do not apply to a rule
// flagged `is_transactional`; `scope: 'all'` applies to everything.
// ============================================================================

export interface SuppressionCheck {
  suppressed: boolean;
  /** Recorded on the outbox row as `skip_reason` when it is. */
  reason?: string;
}

export async function isSuppressed(
  db: SupabaseClient,
  input: {
    facilityId: string;
    channel: "email" | "sms";
    address: string;
    isTransactional: boolean;
  },
): Promise<SuppressionCheck> {
  const address = normaliseAddress(input.channel, input.address);
  if (!address) {
    // Not a suppression, but it is a reason not to send, and the caller needs
    // it recorded rather than discovering it as a provider error later.
    return { suppressed: true, reason: "invalid_address" };
  }

  const { data, error } = await db
    .from("message_suppressions")
    .select("scope, reason")
    .eq("facility_id", input.facilityId)
    .eq("channel", input.channel)
    .eq("address", address)
    .is("released_at", null);

  if (error) {
    // FAIL CLOSED. If we cannot tell whether someone opted out, we do not send.
    // The alternative is messaging people who withdrew consent whenever the
    // database hiccups, which is the one failure mode with legal consequences.
    console.warn("[messaging] suppression lookup failed:", error.message);
    return { suppressed: true, reason: "suppression_check_failed" };
  }

  const rows = (data ?? []) as { scope: string; reason: string }[];
  const applicable = rows.filter(
    (row) => row.scope === "all" || !input.isTransactional,
  );
  if (applicable.length === 0) return { suppressed: false };

  return { suppressed: true, reason: `suppressed:${applicable[0].reason}` };
}

/**
 * Record a withdrawal.
 *
 * Idempotent: the unique index covers active rows only, so asking twice is not
 * an error and re-suppressing after a release opens a new row rather than
 * resurrecting the old one. Nothing here ever deletes — the released row is the
 * proof the withdrawal was honoured, which is the record worth keeping.
 */
export async function suppress(
  db: SupabaseClient,
  input: {
    facilityId: string;
    channel: "email" | "sms";
    address: string;
    reason: "unsubscribed" | "complaint" | "hard_bounce" | "staff" | "sms_stop";
    scope?: "all" | "marketing";
    clientId?: string | null;
    source?: string;
  },
): Promise<boolean> {
  const address = normaliseAddress(input.channel, input.address);
  if (!address) return false;

  const { error } = await db.from("message_suppressions").upsert(
    {
      facility_id: input.facilityId,
      channel: input.channel,
      address,
      scope: input.scope ?? "marketing",
      client_id: input.clientId ?? null,
      reason: input.reason,
      source: input.source ?? null,
    },
    { onConflict: "facility_id,channel,address", ignoreDuplicates: true },
  );

  if (error) {
    console.warn("[messaging] could not suppress:", error.message);
    return false;
  }
  return true;
}

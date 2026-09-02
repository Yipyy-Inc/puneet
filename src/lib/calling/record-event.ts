import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/phone/format";

// ============================================================================
// Turning a signed webhook into a row.
//
// ── WHICH FACILITY? THE NUMBER THAT WAS CALLED ────────────────────────────
//
// A webhook carries no session, so the facility cannot come from the caller —
// and `check:facility-from-session` exists precisely to stop anyone reading it
// out of the request body. It comes from a PARENT ROW: the called number,
// looked up in `communication_numbers`, which only provisioning can write.
//
// That is the sanctioned second source in the rule ("the session, or a parent
// row already scoped by RLS"), and it is the one that applies here.
//
// ── WHICH MEANS THIS RECORDS NOTHING TODAY, AND SAYS SO ───────────────────
//
// `communication_numbers` is EMPTY. No facility has been provisioned a number,
// so every inbound call is currently to Yipyy's own platform number, which
// belongs to no facility. `resolveFacility` returns null and the event is
// dropped with a reason in the log.
//
// The alternative would be to attribute those calls to some facility — the
// first one, the demo one, one derived from a header. All of them fabricate a
// fact about whose call it was, into a table whose whole purpose is being the
// evidence. Dropping it and saying so is the honest failure.
//
// ── A DUPLICATE IS NOT AN ERROR ───────────────────────────────────────────
//
// Carriers retry for hours. The database refuses the second copy (23505, see
// 20260902125815), and this reports `already_recorded` so the route can answer
// 200 and stop the retries. Answering 500 to a duplicate is how a retry storm
// starts.
// ============================================================================

export type CallEventType =
  | "initiated"
  | "ringing"
  | "answered"
  | "completed"
  | "no_answer"
  | "busy"
  | "failed"
  | "voicemail_left"
  | "recording_ready";

/** Twilio's `CallStatus` vocabulary, mapped to ours. */
export function callEventTypeFor(providerStatus: string): CallEventType | null {
  switch (providerStatus.toLowerCase()) {
    case "queued":
    case "initiated":
      return "initiated";
    case "ringing":
      return "ringing";
    case "in-progress":
    case "answered":
      return "answered";
    case "completed":
      return "completed";
    case "busy":
      return "busy";
    case "no-answer":
      return "no_answer";
    case "failed":
    case "canceled":
      return "failed";
    default:
      return null;
  }
}

export interface RecordResult {
  recorded: boolean;
  /** Why nothing was stored, when nothing was. Logged, never returned to the caller. */
  reason?:
    | "no_service_role"
    | "unknown_number"
    | "unmapped_status"
    | "already_recorded"
    | "write_failed";
  facilityId?: string;
}

/**
 * Which facility owns one of these numbers.
 *
 * Tries the called number first and the caller second, so an outbound call —
 * where the facility is the `From` — resolves too.
 */
async function resolveFacility(
  db: ReturnType<typeof createAdminClient>,
  to: string,
  from: string,
): Promise<string | null> {
  const candidates = [toE164(to), toE164(from)].filter(
    (n): n is string => n !== null,
  );
  if (candidates.length === 0) return null;

  const { data, error } = await db
    .from("communication_numbers")
    .select("facility_id, phone_number")
    .in("phone_number", candidates)
    // A released number may have belonged to somebody else since. Only a number
    // in service identifies the facility a live call is for.
    .eq("status", "active")
    .limit(1);

  if (error) {
    console.warn("[calling] number lookup failed:", error.message);
    return null;
  }
  return data?.[0]?.facility_id ?? null;
}

/** A provider timestamp, or now. */
function occurredAt(raw: string | undefined): string {
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  // Safe now that the events which can happen only once are deduped on
  // (sid, type) rather than on the clock — see 20260902125815. It was not safe
  // before, and that is the bug that migration exists to fix.
  return new Date().toISOString();
}

export async function recordCallEvent(input: {
  providerCallSid: string;
  type: CallEventType;
  to: string;
  from: string;
  /** The provider's own timestamp, when it sent one. */
  providerTimestamp?: string;
  payload?: Record<string, unknown>;
}): Promise<RecordResult> {
  if (!hasServiceRoleKey()) {
    return { recorded: false, reason: "no_service_role" };
  }

  const db = createAdminClient();
  const facilityId = await resolveFacility(db, input.to, input.from);
  if (!facilityId) {
    // Expected until provisioning lands. Logged at a level somebody reading
    // production logs will see, because the day this SHOULD resolve and does
    // not, silence would be the whole bug.
    console.info(
      `[calling] no facility owns ${input.to || "(no To)"} — event ${input.type} for ${input.providerCallSid} not recorded`,
    );
    return { recorded: false, reason: "unknown_number" };
  }

  const { error } = await db.from("call_event").insert({
    facility_id: facilityId,
    provider: "twilio",
    provider_call_sid: input.providerCallSid,
    type: input.type,
    occurred_at: occurredAt(input.providerTimestamp),
    payload: {
      ...input.payload,
      from: toE164(input.from) ?? input.from,
      to: toE164(input.to) ?? input.to,
    },
  });

  if (error) {
    // 23505 is the retry being refused, which is the design working.
    if (error.code === "23505") {
      return { recorded: false, reason: "already_recorded", facilityId };
    }
    console.warn("[calling] call_event insert failed:", error.message);
    return { recorded: false, reason: "write_failed", facilityId };
  }

  return { recorded: true, facilityId };
}

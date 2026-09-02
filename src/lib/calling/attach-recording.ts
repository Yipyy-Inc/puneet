import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// A recording belongs to a call, and to nothing else.
//
// `call_recording.call_record_id` is NOT NULL: the row is unreadable without a
// call to hang from, because the read policy scopes by facility and the screens
// reach recordings THROUGH the call. So this resolves the call first and does
// nothing if there is not one yet.
//
// That ordering matters more than it looks. The provider can deliver a
// recording callback before the status callback that completes the call — they
// are separate deliveries with separate retry schedules. Inserting a recording
// against a call that has not been projected yet would fail the foreign key;
// skipping it and letting the provider retry is the behaviour that recovers.
// ============================================================================

export async function attachRecording(input: {
  facilityId: string;
  providerCallSid: string;
  providerRecordingSid: string;
  recordingUrl: string | null;
  durationSeconds: number | null;
  transcript: string | null;
}): Promise<{ attached: boolean; reason?: string }> {
  if (!hasServiceRoleKey())
    return { attached: false, reason: "no_service_role" };

  const db = createAdminClient();

  const { data: call } = await db
    .from("call_record")
    .select("id")
    .eq("provider_call_sid", input.providerCallSid)
    .limit(1)
    .maybeSingle();

  if (!call) {
    // The provider will retry. See the header — this is the recoverable order.
    console.info(
      `[calling] recording ${input.providerRecordingSid} arrived before call ${input.providerCallSid}`,
    );
    return { attached: false, reason: "call_not_yet_recorded" };
  }

  const { error } = await db.from("call_recording").insert({
    facility_id: input.facilityId,
    call_record_id: call.id,
    provider_recording_sid: input.providerRecordingSid,
    recording_url: input.recordingUrl,
    duration_s: input.durationSeconds,
    transcript: input.transcript,
  });

  if (error) {
    // Unique on provider_recording_sid — a retried callback, not a failure.
    if (error.code === "23505")
      return { attached: false, reason: "already_attached" };
    console.warn("[calling] call_recording insert failed:", error.message);
    return { attached: false, reason: "write_failed" };
  }
  return { attached: true };
}

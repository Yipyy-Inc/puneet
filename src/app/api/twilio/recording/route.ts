import { recordCallEvent } from "@/lib/calling/record-event";
import { attachRecording } from "@/lib/calling/attach-recording";
import { platformTwilio } from "@/lib/twilio/config";
import { verifyTwilioWebhook } from "@/lib/twilio/signature";
import { twimlResponse } from "@/lib/twiml";

// Recording + transcription webhook. When a caller leaves a voicemail the
// provider records it and, once its speech-to-text finishes, POSTs the result
// here — RecordingUrl, RecordingDuration, From, TranscriptionText.
//
// ── IT USED TO PARSE THE PAYLOAD AND THROW IT AWAY ────────────────────────
//
//   const payload = { ... };
//   // In production: persist `payload` as a SupportVoicemail (isNew: true).
//   void payload;
//
// It also verified no signature, so any caller could post a RecordingUrl and a
// transcript. Both are fixed: signed since Phase 1c, and stored since the call
// tables landed.
//
// The row goes in `call_recording`, which is SEPARATE from `call_record`
// because `calling_view_recordings` is a real permission key and a policy
// filters rows, not columns.
export async function POST(request: Request): Promise<Response> {
  const check = await verifyTwilioWebhook(request, platformTwilio()?.authToken);
  if (!check.ok) return check.response;

  const sid = check.params.CallSid ?? "";
  const recordingSid = check.params.RecordingSid ?? "";

  if (sid && recordingSid) {
    const outcome = await recordCallEvent({
      providerCallSid: sid,
      type: "recording_ready",
      to: check.params.To ?? "",
      from: check.params.From ?? "",
      providerTimestamp: check.params.Timestamp,
      payload: { recording_sid: recordingSid },
    });

    // Only once the facility is known. `attachRecording` needs the call row,
    // and a recording with no call to hang from is a row nothing can ever read.
    if (outcome.facilityId) {
      await attachRecording({
        facilityId: outcome.facilityId,
        providerCallSid: sid,
        providerRecordingSid: recordingSid,
        recordingUrl: check.params.RecordingUrl ?? null,
        durationSeconds: Number(check.params.RecordingDuration ?? 0) || null,
        transcript: check.params.TranscriptionText || null,
      });
    }
  }

  return twimlResponse(`<Response></Response>`);
}

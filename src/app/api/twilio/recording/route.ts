import { platformTwilio } from "@/lib/twilio/config";
import { verifyTwilioWebhook } from "@/lib/twilio/signature";
import { twimlResponse } from "@/lib/twiml";

// Recording + transcription webhook. When a caller leaves a voicemail the
// provider records it and, once its speech-to-text finishes, POSTs the result
// here — RecordingUrl, RecordingDuration, From, TranscriptionText.
//
// ── WHAT IT DOES WITH THAT, HONESTLY ──────────────────────────────────────
//
// Nothing yet. There is no table for a voicemail; the inbox reads a fixture.
// The payload is acknowledged and discarded, and this comment is the whole
// truth about it — persisting arrives with call records in Phase 3.
//
// ── BUT IT NO LONGER ACCEPTS THAT FROM ANYONE ─────────────────────────────
//
// It verified nothing, so any caller could post a RecordingUrl and a
// transcript. That mattered less while the handler discards them and will
// matter enormously the day it does not — and a route that starts storing what
// it is given is not the moment to remember the signature check.
export async function POST(request: Request): Promise<Response> {
  const check = await verifyTwilioWebhook(request, platformTwilio()?.authToken);
  if (!check.ok) return check.response;

  const payload = {
    from: check.params.From ?? "",
    recordingUrl: check.params.RecordingUrl ?? "",
    recordingSid: check.params.RecordingSid ?? "",
    durationSeconds: Number(check.params.RecordingDuration ?? 0),
    transcription: check.params.TranscriptionText ?? "",
    transcriptionStatus: check.params.TranscriptionStatus ?? "",
  };
  // Phase 3: persist as a voicemail row. Until then it is genuinely dropped.
  void payload;

  return twimlResponse(`<Response></Response>`);
}

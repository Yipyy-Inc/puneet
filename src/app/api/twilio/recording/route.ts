import { twimlResponse } from "@/lib/twiml";

// Recording + transcription webhook (the speech-to-text integration point for
// the Voicemail tab). When a caller leaves a voicemail, Twilio records it with
// <Record transcribe="true" .../> and, once its STT finishes, POSTs the result
// here — RecordingUrl, RecordingDuration, From, and TranscriptionText /
// TranscriptionStatus. In production this handler would persist the voicemail
// (and its AI transcript) so it shows up in the inbox. Live credentials aren't
// wired in this prototype, so we just acknowledge the callback; the inbox is
// seeded with representative transcripts. (URL comes from twilioWebhooks().recording.)

export async function POST(req: Request): Promise<Response> {
  try {
    const form = await req.formData();
    const payload = {
      from: String(form.get("From") ?? ""),
      recordingUrl: String(form.get("RecordingUrl") ?? ""),
      recordingSid: String(form.get("RecordingSid") ?? ""),
      durationSeconds: Number(form.get("RecordingDuration") ?? 0),
      transcription: String(form.get("TranscriptionText") ?? ""),
      transcriptionStatus: String(form.get("TranscriptionStatus") ?? ""),
    };
    // In production: persist `payload` as a SupportVoicemail (isNew: true).
    void payload;
  } catch {
    // no / invalid form body
  }
  // Twilio expects a 200 with (optionally empty) TwiML on recording callbacks.
  return twimlResponse(`<Response></Response>`);
}

export async function GET(): Promise<Response> {
  return new Response("OK", { status: 200 });
}

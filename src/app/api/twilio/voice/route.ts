import { defaultSupportIvrConfig } from "@/data/support-ivr";
import { recordCallEvent } from "@/lib/calling/record-event";
import { platformTwilio } from "@/lib/twilio/config";
import { verifyTwilioWebhook } from "@/lib/twilio/signature";
import { escapeXml, twimlResponse } from "@/lib/twiml";

// Inbound-call webhook. The provider POSTs here when somebody calls; the IVR
// menu plays and the chosen digit is handled by /api/twilio/status.
//
// ── IT USED TO ANSWER ANYONE, INCLUDING A GET ─────────────────────────────
//
// This route verified nothing and exported a GET returning the same TwiML,
// while `src/proxy.ts` excluded all of `api/twilio` from auth because "Twilio
// signs its own webhooks" — true of one of the five. Signature-verified since
// Phase 1c; the GET is gone rather than signed, because an unauthenticated 200
// is what makes a "the route refuses" test pass against a deleted route.
//
// ── AND IT NOW RECORDS THE CALL ───────────────────────────────────────────
//
// A `ringing` event, keyed to whichever facility owns the number that was
// called. The TwiML answer does not wait on that: a caller hearing silence
// because a database write was slow is a worse failure than an unrecorded
// event, and the event can be reconstructed from the status callback.
function ivrTwiml(): Response {
  const ivr = defaultSupportIvrConfig;
  const prompt = ivr.menu
    .map((o) => `Press ${o.key} for ${o.label}.`)
    .join(" ");
  return twimlResponse(
    `<Response>
  <Gather numDigits="1" timeout="6" action="/api/twilio/status" method="POST">
    <Say voice="alice">${escapeXml(ivr.greeting)}</Say>
    <Say voice="alice">${escapeXml(prompt)}</Say>
  </Gather>
  <Say voice="alice">We didn't receive a selection. Goodbye.</Say>
</Response>`,
  );
}

export async function POST(request: Request): Promise<Response> {
  const check = await verifyTwilioWebhook(request, platformTwilio()?.authToken);
  if (!check.ok) return check.response;

  const sid = check.params.CallSid ?? "";
  if (sid) {
    // Not awaited into the response path — see the header. Failures are logged
    // by the recorder; there is nothing the caller could be told about one.
    void recordCallEvent({
      providerCallSid: sid,
      type: "ringing",
      to: check.params.To ?? "",
      from: check.params.From ?? "",
      providerTimestamp: check.params.Timestamp,
      payload: { direction: "inbound" },
    });
  }

  return ivrTwiml();
}

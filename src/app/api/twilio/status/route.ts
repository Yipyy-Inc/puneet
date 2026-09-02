import { callEventTypeFor, recordCallEvent } from "@/lib/calling/record-event";
import { platformTwilio } from "@/lib/twilio/config";
import { verifyTwilioWebhook } from "@/lib/twilio/signature";
import { twimlResponse } from "@/lib/twiml";

// This URL does two jobs, and they are told apart by what the provider sends.
//
//   `Digits`      — the caller pressed a key on the IVR menu (voice/route.ts
//                   points its <Gather action> here). Answer with TwiML.
//   `CallStatus`  — a call-progress callback. Record it; the provider ignores
//                   the body but insists on a 2xx or it retries for hours.
//
// Signature-verified since Phase 1c. Its GET returned a bare 200 "OK" and is
// gone: an unauthenticated endpoint that answers 200 is what lets a security
// assertion pass against a route that no longer exists.
export async function POST(request: Request): Promise<Response> {
  const check = await verifyTwilioWebhook(request, platformTwilio()?.authToken);
  if (!check.ok) return check.response;

  const status = check.params.CallStatus ?? "";
  const sid = check.params.CallSid ?? "";

  if (status && sid) {
    const type = callEventTypeFor(status);
    if (type) {
      // Awaited here, unlike the voice route: nobody is listening to silence
      // on a status callback, and a completed event that never lands is a call
      // missing from every count on the Analytics tab.
      await recordCallEvent({
        providerCallSid: sid,
        type,
        to: check.params.To ?? "",
        from: check.params.From ?? "",
        providerTimestamp: check.params.Timestamp,
        payload: {
          direction: check.params.Direction?.startsWith("outbound")
            ? "outbound"
            : "inbound",
          // Twilio sends CallDuration in whole seconds on a completed call.
          ...(check.params.CallDuration
            ? { duration_s: check.params.CallDuration }
            : {}),
        },
      });
    } else {
      // A status we do not model. Logged rather than dropped silently, because
      // the alternative is a gap in the log nobody can explain later.
      console.info(`[calling] unmapped CallStatus '${status}' for ${sid}`);
    }
  }

  // The gather response. Returned for a status callback too — the provider
  // ignores TwiML on those, and a 200 is what stops the retries.
  return twimlResponse(
    `<Response>
  <Say voice="alice">Thanks. Connecting you to the next available Yipyy support agent.</Say>
</Response>`,
  );
}

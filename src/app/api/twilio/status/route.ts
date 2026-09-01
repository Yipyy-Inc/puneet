import { platformTwilio } from "@/lib/twilio/config";
import { verifyTwilioWebhook } from "@/lib/twilio/signature";
import { twimlResponse } from "@/lib/twiml";

// Status / IVR-gather callback. For a menu selection this connects the caller
// to the next available agent; for plain call-progress events it acknowledges.
//
// Signature-verified since Phase 1c. It used to accept anything, and its GET
// returned a bare 200 "OK" — an unauthenticated endpoint that answers 200 is
// what makes a security assertion pass against a route that has been deleted,
// so the GET is gone rather than left as a convenience.
export async function POST(request: Request): Promise<Response> {
  const check = await verifyTwilioWebhook(request, platformTwilio()?.authToken);
  if (!check.ok) return check.response;

  return twimlResponse(
    `<Response>
  <Say voice="alice">Thanks. Connecting you to the next available Yipyy support agent.</Say>
</Response>`,
  );
}

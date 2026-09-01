import { defaultSupportIvrConfig } from "@/data/support-ivr";
import { platformTwilio } from "@/lib/twilio/config";
import { verifyTwilioWebhook } from "@/lib/twilio/signature";
import { escapeXml, twimlResponse } from "@/lib/twiml";

// Inbound-call webhook. The provider POSTs here when somebody calls the Yipyy
// support number; the IVR menu plays and the chosen digit is handled by
// /api/twilio/status.
//
// ── IT USED TO ANSWER ANYONE, INCLUDING A GET ─────────────────────────────
//
// This route verified nothing and exported a GET that returned the same TwiML.
// `src/proxy.ts` excludes all of `api/twilio` from auth because "Twilio signs
// its own webhooks", which was true of exactly one of the five. So the IVR
// greeting — the facility's own recorded prompt, in production — was readable
// by anyone who guessed the path, and every one of those requests looked to us
// like a real call.
//
// The GET is gone rather than signed: the provider POSTs, a signature over a
// GET covers only the URL, and an unauthenticated 200 is precisely what makes a
// "the route refuses" test pass against a route that no longer exists.
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
  return ivrTwiml();
}

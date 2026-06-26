import { defaultSupportIvrConfig } from "@/data/support-ivr";
import { escapeXml, twimlResponse } from "@/lib/twiml";

// Inbound-call webhook. Twilio POSTs here when a facility calls the Yipyy
// support number. In production the enabled smart routing rules (Task 18) are
// evaluated against the caller first; otherwise the IVR menu plays and the
// chosen digit enqueues the caller into the Live tab queue (Task 17).
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

export async function POST(): Promise<Response> {
  return ivrTwiml();
}

export async function GET(): Promise<Response> {
  return ivrTwiml();
}

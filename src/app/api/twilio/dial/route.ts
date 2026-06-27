import { escapeXml, twimlResponse } from "@/lib/twiml";

// Outbound-call webhook. The Dialer (Task 48) places calls from the Yipyy
// support number; Twilio requests this URL to get the TwiML that dials the
// destination the agent entered. The caller ID comes from the call's `from`
// (Twilio sends `From` in the form post; the Dialer also passes it on the
// query string), falling back to the support number.
const SUPPORT_CALLER_ID = "+14155550100";

/** Normalize a display number to an E.164 caller ID, e.g.
 *  "+1 (415) 555-0100" → "+14155550100". Falls back to the support number. */
function toCallerId(from: string): string {
  const d = from.replace(/\D/g, "");
  return d.length >= 7 ? `+${d}` : SUPPORT_CALLER_ID;
}

async function dialTwiml(to: string, from: string): Promise<Response> {
  const callerId = toCallerId(from);
  return twimlResponse(
    `<Response>
  <Dial callerId="${escapeXml(callerId)}">${escapeXml(to)}</Dial>
</Response>`,
  );
}

export async function POST(req: Request): Promise<Response> {
  let to = "";
  let from = "";
  try {
    const form = await req.formData();
    to = String(form.get("To") ?? "");
    from = String(form.get("From") ?? "");
  } catch {
    // no form body
  }
  return dialTwiml(to, from);
}

export async function GET(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  return dialTwiml(params.get("to") ?? "", params.get("from") ?? "");
}

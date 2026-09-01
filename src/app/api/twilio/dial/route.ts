import { toE164 } from "@/lib/phone/format";
import { escapeXml, twimlResponse } from "@/lib/twiml";

// Outbound-call webhook. The Dialer (Task 48) places calls from the Yipyy
// support number; Twilio requests this URL to get the TwiML that dials the
// destination the agent entered. The caller ID comes from the call's `from`
// (Twilio sends `From` in the form post; the Dialer also passes it on the
// query string), falling back to the support number.
const SUPPORT_CALLER_ID = "+14155550100";

/**
 * A display number as an E.164 caller ID, falling back to the support number.
 *
 * This used to be `"+" + digits` for anything with seven or more of them, which
 * turned a 10-digit North American number into `+5145550100` — country code 514
 * — and would have presented an unroutable caller ID on a real call. `toE164`
 * reads the same input as `+15145550100`, and returns null rather than a guess
 * for anything it cannot place, which is what makes the fallback meaningful.
 */
function toCallerId(from: string): string {
  return toE164(from) ?? SUPPORT_CALLER_ID;
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

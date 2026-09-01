import { toE164 } from "@/lib/phone/format";
import { platformTwilio } from "@/lib/twilio/config";
import { verifyTwilioWebhook } from "@/lib/twilio/signature";
import { escapeXml, twimlResponse } from "@/lib/twiml";

// Outbound-call webhook. The provider requests this URL to get the TwiML that
// dials the destination, and the caller ID comes from the call's `From`.
//
// ── THE GET IS GONE, AND SO IS WHAT USED IT ───────────────────────────────
//
// There was a GET taking `?to=&from=` off the query string, built by
// /api/twilio/call — an unauthenticated endpoint that let any caller specify
// both legs of a call. Nothing dialled, so nothing happened; the day it does,
// that is an open relay somebody else pays for. `call` has moved behind a
// session and a permission (/api/facility/calling/outbound) and no longer
// constructs a dial URL, so this route is POST-only and signed like the rest.
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

export async function POST(request: Request): Promise<Response> {
  const check = await verifyTwilioWebhook(request, platformTwilio()?.authToken);
  if (!check.ok) return check.response;

  const to = check.params.To ?? "";
  const callerId = toCallerId(check.params.From ?? "");
  return twimlResponse(
    `<Response>
  <Dial callerId="${escapeXml(callerId)}">${escapeXml(to)}</Dial>
</Response>`,
  );
}

// Outbound-call initiation endpoint for the Dialer (Task 19). The Dialer POSTs
// { to, from } here to PLACE a call from the Yipyy support number. In production
// this initiates the call via the Twilio REST API:
//
//   const client = twilio(accountSid, authToken);
//   await client.calls.create({
//     to,
//     from,
//     url: `${origin}/api/twilio/dial?to=${to}`,
//   });
//
// Twilio then fetches /api/twilio/dial for the TwiML that bridges the two legs
// (<Dial callerId="{from}">{to}</Dial>). Live credentials / the twilio SDK
// aren't wired into this prototype, so we validate the request and return a
// representative queued call (callSid + status) — the same "real route handler,
// representative result" shape as the other /api/twilio/* webhooks.

import { dialDigits } from "@/lib/twilio-dialer";

export async function POST(req: Request): Promise<Response> {
  let to = "";
  let from = "";
  try {
    const body = (await req.json()) as { to?: string; from?: string };
    to = String(body.to ?? "");
    from = String(body.from ?? "");
  } catch {
    // no / invalid JSON body
  }

  if (dialDigits(to).length < 7) {
    return Response.json(
      { ok: false, error: "A valid destination number is required." },
      { status: 400 },
    );
  }
  if (dialDigits(from).length < 7) {
    return Response.json(
      { ok: false, error: "A valid caller number is required." },
      { status: 400 },
    );
  }

  // Carry the caller ID through to the TwiML webhook so the right "from" number
  // is used on the dialed leg (the webhook falls back to the support number).
  const origin = new URL(req.url).origin;
  const dialUrl = `${origin}/api/twilio/dial?to=${encodeURIComponent(
    to,
  )}&from=${encodeURIComponent(from)}`;
  const callSid = `CA${crypto.randomUUID().replace(/-/g, "")}`;

  return Response.json({
    ok: true,
    callSid,
    to,
    from,
    status: "queued",
    dialUrl,
  });
}

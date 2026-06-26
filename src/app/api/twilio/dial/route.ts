import { escapeXml, twimlResponse } from "@/lib/twiml";

// Outbound-call webhook. The Dialer (Task 48) places calls from the Yipyy
// support number; Twilio requests this URL to get the TwiML that dials the
// destination the agent entered.
const SUPPORT_CALLER_ID = "+14155550100";

async function dialTwiml(to: string): Promise<Response> {
  return twimlResponse(
    `<Response>
  <Dial callerId="${SUPPORT_CALLER_ID}">${escapeXml(to)}</Dial>
</Response>`,
  );
}

export async function POST(req: Request): Promise<Response> {
  let to = "";
  try {
    const form = await req.formData();
    to = String(form.get("To") ?? "");
  } catch {
    // no form body
  }
  return dialTwiml(to);
}

export async function GET(req: Request): Promise<Response> {
  const to = new URL(req.url).searchParams.get("to") ?? "";
  return dialTwiml(to);
}

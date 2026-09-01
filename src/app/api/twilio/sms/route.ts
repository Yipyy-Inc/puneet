import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { normalisePhone } from "@/lib/messaging/send";
import { suppress } from "@/lib/messaging/suppression";
import { platformTwilio } from "@/lib/twilio/config";
import { inboundIntent, verifyTwilioWebhook } from "@/lib/twilio/signature";

// ============================================================================
// Somebody texted back.
//
// ── THE GAP THIS CLOSES ───────────────────────────────────────────────────
//
// `suppress()` has existed since 20260827111420 and, until now, had ZERO CALL
// SITES. `message_suppressions.reason` includes `'sms_stop'` — a value nothing
// could produce. So a customer texting STOP was handled inside Twilio, our
// database never learned, and every screen in this product went on believing
// that number was reachable. A facility reading its own delivery figures would
// have seen carrier failures it could not explain, and a facility that changed
// provider would have carried the mistake across with it.
//
// ── IT IS SIGNED, AND UNSIGNED MEANS REFUSED ──────────────────────────────
//
// This is an unauthenticated POST that WRITES. Without the signature check
// anybody who finds the URL could silence any number at any facility, and
// because a suppression is supposed to stop messages there would be nothing to
// see when it worked. `api/twilio` is excluded from the proxy matcher, so this
// route is the only thing standing there.
//
// ── ONE NUMBER, EVERY FACILITY THAT SHARES IT ─────────────────────────────
//
// `send.ts` uses ONE platform Twilio number for the whole product. Inbound
// routing keys on (from, to), and with a shared `to` the only discriminator is
// the customer's own number — so a STOP is recorded for EVERY facility that has
// ever messaged that number. That is the correct reading of a withdrawal sent
// to a number the customer experiences as one sender, and it is also why the
// SMS rating parser cannot be built until sending numbers are per-facility:
// the same ambiguity that makes a broad STOP right makes a "5" unattributable.
//
// ── THE REPLY IS EMPTY TwiML, ON PURPOSE ──────────────────────────────────
//
// Twilio sends whatever this returns as an SMS. An error page or a stack trace
// would be texted to a customer, so every path returns `<Response/>` and the
// carrier's own STOP confirmation is the only thing they receive.
// ============================================================================

export const dynamic = "force-dynamic";

/** Twilio texts the body of the response. Nothing is always the safe answer. */
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response/>';

function twiml(): NextResponse {
  return new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(request: NextRequest) {
  // The shared verifier, so all five webhooks refuse identically. This route
  // used to answer 200 with empty TwiML when the deployment had no credentials,
  // reasoning that the provider should not retry for hours — but that reasoning
  // needs a provider, and where there is one this still returns 200 after the
  // signature checks out. Unconfigured, the only callers are probes, and 200 to
  // a probe is what makes "unsigned is refused" untestable.
  const check = await verifyTwilioWebhook(request, platformTwilio()?.authToken);
  if (!check.ok) return check.response;
  const params = check.params;

  const from = normalisePhone(params.From ?? "");
  const intent = inboundIntent(params.Body ?? "");
  if (!from || intent === "other" || !hasServiceRoleKey()) {
    // An ordinary reply. There is nothing to do with it yet — the rating parser
    // needs per-facility numbers first — and pretending otherwise would be
    // worse than dropping it. See the header.
    return twiml();
  }

  const db = createAdminClient();

  // Which facilities have ever messaged this number. A withdrawal applies to
  // all of them, because the customer sent it to one sender as far as they are
  // concerned. Read from the outbox rather than from `clients`, so a number
  // that was messaged but never became a client is still honoured.
  const { data: reached } = await db
    .from("message_sends")
    .select("facility_id, client_id")
    .eq("channel", "sms")
    .eq("to_address", from)
    .limit(200);

  const facilities = new Map<string, string | null>();
  for (const row of (reached ?? []) as {
    facility_id: string;
    client_id: string | null;
  }[]) {
    if (!facilities.has(row.facility_id)) {
      facilities.set(row.facility_id, row.client_id);
    }
  }

  if (intent === "stop") {
    for (const [facilityId, clientId] of facilities) {
      await suppress(db, {
        facilityId,
        channel: "sms",
        address: from,
        reason: "sms_stop",
        // 'all', not 'marketing'. A customer who texts STOP has not asked to
        // keep receiving booking confirmations, and CASL treats the withdrawal
        // as attaching to the address rather than to a category we chose.
        scope: "all",
        clientId,
        source: `twilio:${params.MessageSid ?? "inbound"}`,
      });
    }
  }

  // START and HELP are deliberately NOT handled as a release. Re-subscribing
  // somebody because they texted "start" would mean an unauthenticated POST can
  // re-enable messaging to a number, which is the wrong way round for a
  // consent record: withdrawal should be cheap and reinstatement deliberate.
  // Twilio's own carrier-level START still lets their messages through; ours
  // stays suppressed until a person releases it.

  return twiml();
}

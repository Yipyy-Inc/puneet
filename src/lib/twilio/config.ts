import "server-only";

// ============================================================================
// Yipyy's OWN Twilio account.
//
// ── THIS IS THE PARENT, NOT A FACILITY ────────────────────────────────────
//
// Two different Twilio identities exist in this product and conflating them is
// how one facility ends up able to send as another:
//
//   Yipyy      ONE account, in the deployment environment. Owns the support
//              desk line, the status-page SMS sender, and the authority to
//              create subaccounts. This file.
//
//   a facility A SUBACCOUNT of the above, one per facility, with its own SID,
//              its own auth token and its own numbers. Those credentials live
//              in Vault (private.communication_credentials) and are reached
//              through public.communication_auth_token — never here.
//
// The parent token can act on every subaccount at once, which is exactly why it
// is an environment variable and never a database row: there is no facility it
// belongs to, and any table that could hold it is a table some facility can be
// given a policy on by mistake.
//
// ── IT REPLACED A STORE IN THE BROWSER ────────────────────────────────────
//
// src/hooks/use-twilio-config.ts held `accountSid` and `authToken` in module
// state on the client, seeded `connected: true` with placeholder credentials,
// and offered a "Test Connection" that returned true when both fields were
// non-empty. Every calling screen gated on that boolean, so the support desk
// rendered as a live phone system on a deployment with no Twilio at all.
//
// Unset here means unset. `platformTwilio()` returns null and the callers say
// so, which is the honest answer rather than a phone system that appears to
// work until somebody dials it.
// ============================================================================

export interface PlatformTwilio {
  accountSid: string;
  authToken: string;
}

/**
 * The parent credentials, or null when this deployment has no Twilio.
 *
 * BOTH must resolve. A SID with no token is not a degraded connection — every
 * request it makes is a 401, and reporting it as configured turns a missing
 * environment variable into a mystery at the carrier.
 */
export function platformTwilio(): PlatformTwilio | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!accountSid || !authToken) return null;

  // A subaccount SID is also an AC…, so this cannot tell parent from child. It
  // catches the paste that is not an account SID at all — an API key (SK…), a
  // messaging service (MG…), a number (PN…) — each of which fails later as an
  // indistinguishable 401.
  if (!/^AC[0-9a-fA-F]{32}$/.test(accountSid)) return null;

  return { accountSid, authToken };
}

/**
 * The number Yipyy sends from when no facility is involved — the status page's
 * SMS subscription, a platform notice.
 *
 * STATUS_SMS_FROM is honoured second because it predates TWILIO_PHONE_NUMBER
 * and is already set on deployments that use the status page.
 */
export function platformSendingNumber(): string | null {
  const number =
    process.env.TWILIO_PHONE_NUMBER?.trim() ??
    process.env.STATUS_SMS_FROM?.trim();
  return number && number.length > 0 ? number : null;
}

/**
 * This deployment's public address.
 *
 * Deliberately does NOT take a request, unlike src/lib/public-origin.ts. That
 * file answers "where should this link in this email point", which depends on
 * who is receiving it. This answers "where will Twilio POST", which is a
 * property of the deployment and is configured once, in Twilio's console, by
 * somebody reading it off a screen. A webhook URL derived from whoever happened
 * to load that screen would be pasted into Twilio and then be wrong forever.
 *
 * The twin of this function is publicOrigin() in src/lib/clover/config.ts, for
 * the same reason.
 */
function deploymentOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  if (domain) return `https://${domain}`;

  return "http://localhost:3000";
}

export interface TwilioWebhookUrls {
  /** Inbound call → IVR menu, then the support queue. */
  inboundVoice: string;
  /** TwiML that bridges the two legs of an outbound call. */
  outboundDial: string;
  /** Call progress events. */
  statusCallback: string;
  /** Recording ready, with Twilio's transcription. */
  recording: string;
}

export function twilioWebhookUrls(): TwilioWebhookUrls {
  const root = deploymentOrigin();
  return {
    inboundVoice: `${root}/api/twilio/voice`,
    outboundDial: `${root}/api/twilio/dial`,
    statusCallback: `${root}/api/twilio/status`,
    recording: `${root}/api/twilio/recording`,
  };
}

/**
 * True when Twilio could actually reach us.
 *
 * Twilio will not POST to http://localhost, and it requires HTTPS. A deployment
 * running locally can send messages perfectly well and will never receive a
 * single inbound one — a difference worth stating on the screen rather than
 * leaving somebody to conclude their number is broken.
 */
export function webhooksAreReachable(): boolean {
  return deploymentOrigin().startsWith("https://");
}

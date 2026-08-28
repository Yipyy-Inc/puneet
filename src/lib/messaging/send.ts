import "server-only";

// ============================================================================
// The one place Yipyy puts a message on the wire.
//
// Lifted, deliberately, from `@/lib/clover/receipt-delivery` — which is the
// only sender in the codebase that got the details right: E.164 normalisation
// before Twilio can refuse it, a timeout so a hung provider cannot hold a
// request open, environment gating that degrades honestly instead of
// pretending, and a return value rather than a throw.
//
// ── WHY A SHARED MODULE, WHEN SIX ALREADY EXIST ───────────────────────────
//
// There are six hand-rolled `fetch("https://api.resend.com/emails")` call
// sites and two Twilio ones, each with its own idea of what a failure looks
// like. That was survivable while every send was a one-off triggered by a
// human. It stops being survivable when a scheduler sends thousands
// unattended, because three things now have to be true of EVERY send and
// cannot be re-implemented per caller:
//
//   1. The address is checked against the suppression list. Once, here, at the
//      point of sending — not in the caller. A check in the caller is a check
//      the next caller forgets, and under CASL "we forgot" is not a defence.
//   2. The address is normalised by the SAME function the suppression list was
//      written with. A suppression stored as +15145551234 against a send
//      attempted on 5145551234 is a suppression that does not exist.
//   3. The attempt is recorded whether it succeeded or not.
//
// The existing six are deliberately NOT refactored onto this — boy-scout
// cleanup is opt-in here, and rewriting the invite emails to prove a point
// about automations is how unrelated things break. The duplication is noted in
// docs/quality/debt-map.md.
//
// ── NOTHING HERE THROWS ───────────────────────────────────────────────────
//
// Same rule as the receipt senders: by the time this runs, the booking is
// taken and the card is charged. A message that cannot be sent is a message
// that cannot be sent; it is not a reason to fail the thing that caused it.
// Every function returns a result and the caller records it.
// ============================================================================

import { platformSendingNumber, platformTwilio } from "@/lib/twilio/config";

export interface DeliveryResult {
  sent: boolean;
  /**
   * Why not, when not — recorded on the outbox row and shown to staff, never
   * to the customer. `message_sends.skip_reason` and `last_error` are read
   * straight off this: "not sent" without a reason is the one thing staff
   * cannot act on.
   */
  detail?: string;
  /**
   * The provider's own id for the message, when it gave one. Resend returns an
   * id in its body; Twilio returns a `sid`. Kept so a delivery question can be
   * answered in the provider's dashboard rather than by guessing.
   */
  providerId?: string;
}

// ── Address normalisation ───────────────────────────────────────────────────
//
// EXPORTED, and that is the point. The suppression list stores whatever these
// return, and every send is checked against it using the same value. Two
// normalisers is the same bug as no normaliser.

/**
 * A phone number in E.164, or null if it cannot be made into one.
 *
 * Accepts what a human or a card terminal actually types: a bare 10-digit North
 * American number, an 11-digit one starting with 1, or anything already in
 * E.164. Refuses everything else rather than handing Twilio something it will
 * answer with a 400 that reads like an outage.
 */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+")
    ? digits
    : digits.length === 10
      ? `+1${digits}`
      : digits.length === 11 && digits.startsWith("1")
        ? `+${digits}`
        : null;
  if (!e164 || !/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  return e164;
}

/**
 * An email address lowercased and trimmed, or null if it is not one.
 *
 * The pattern is deliberately the same loose one the receipt sender uses. It is
 * not RFC 5322 and is not trying to be — it exists to catch the typo a person
 * makes on a terminal keypad, so the provider's 422 never happens.
 */
export function normaliseEmail(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(trimmed)) return null;
  return trimmed;
}

/** Normalise by channel, so callers do not branch on it themselves. */
export function normaliseAddress(
  channel: "email" | "sms",
  raw: string,
): string | null {
  return channel === "email" ? normaliseEmail(raw) : normalisePhone(raw);
}

// ── Email ───────────────────────────────────────────────────────────────────

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  /**
   * The plain-text part. Required, not optional: a text-only client showing an
   * empty message is indistinguishable from a message that never arrived, and
   * a mail with no text part scores worse with every spam filter.
   */
  text: string;
  /** Overrides EMAIL_FROM — a facility sending under its own name. */
  from?: string;
  replyTo?: string;
  /**
   * List-Unsubscribe, for anything that is not transactional. Gmail and Outlook
   * both surface this as a one-click control, and a bulk sender that omits it
   * gets filtered. The caller passes the same URL that appears in the body.
   */
  unsubscribeUrl?: string;
}

export async function sendEmail(
  message: EmailMessage,
): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, detail: "no email service configured" };

  const to = normaliseEmail(message.to);
  if (!to) return { sent: false, detail: "that email address is not valid" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:
          message.from ??
          process.env.EMAIL_FROM ??
          "Yipyy <onboarding@resend.dev>",
        to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
        ...(message.unsubscribeUrl
          ? {
              headers: {
                "List-Unsubscribe": `<${message.unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[messaging] email -> ${response.status} ${detail}`.slice(0, 300),
      );
      return { sent: false, detail: `email service said ${response.status}` };
    }

    const body = (await response.json().catch(() => null)) as {
      id?: string;
    } | null;
    return { sent: true, providerId: body?.id };
  } catch (error) {
    console.warn("[messaging] email failed:", error);
    return {
      sent: false,
      detail: error instanceof Error ? error.message : "network",
    };
  }
}

// ── SMS ─────────────────────────────────────────────────────────────────────

export interface SmsMessage {
  to: string;
  body: string;
}

/**
 * Text a customer.
 *
 * ── WHICH TWILIO ACCOUNT ─────────────────────────────────────────────────
 *
 * The PLATFORM one, from the environment — the same answer, and the same
 * reason, as the receipt sender. A facility is meant to send from its own
 * subaccount and its own number (migration 20260809200000), but
 * `communication_connections` is empty, so a per-facility lookup would resolve
 * to nothing on every call. When subaccounts exist this grows a facility
 * branch. Until then it sends from Yipyy's number rather than pretending to
 * send from theirs.
 *
 * The practical consequence, worth knowing before enabling an SMS rule: a
 * customer replying STOP stops YIPYY's number for that customer, across every
 * facility sharing it.
 */
export async function sendSms(message: SmsMessage): Promise<DeliveryResult> {
  const twilio = platformTwilio();
  const from = platformSendingNumber();
  if (!twilio || !from) {
    return { sent: false, detail: "no SMS service configured" };
  }

  const to = normalisePhone(message.to);
  if (!to) return { sent: false, detail: "that phone number is not valid" };

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${twilio.accountSid}:${twilio.authToken}`,
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: from,
          Body: message.body,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[messaging] sms -> ${response.status} ${detail}`.slice(0, 300),
      );
      return { sent: false, detail: `SMS service said ${response.status}` };
    }

    const body = (await response.json().catch(() => null)) as {
      sid?: string;
    } | null;
    return { sent: true, providerId: body?.sid };
  } catch (error) {
    console.warn("[messaging] sms failed:", error);
    return {
      sent: false,
      detail: error instanceof Error ? error.message : "network",
    };
  }
}

/**
 * Whether a channel can send at all in this deployment.
 *
 * The automations screen uses this to say "SMS is not configured" before
 * someone builds a rule around it, rather than letting every send fail quietly
 * with `detail: "no SMS service configured"` on a row nobody reads.
 */
export function channelConfigured(channel: "email" | "sms"): boolean {
  if (channel === "email") return Boolean(process.env.RESEND_API_KEY?.trim());
  return Boolean(platformTwilio() && platformSendingNumber());
}

import "server-only";

import {
  buildReceiptHtml,
  buildReceiptSmsText,
  type ReceiptInput,
} from "@/lib/clover/receipt";
import { platformSendingNumber, platformTwilio } from "@/lib/twilio/config";

// ============================================================================
// Sending OUR receipt — the itemised one — by email and by text.
//
// ── WHY NOT JUST LET CLOVER SEND IT ───────────────────────────────────────
//
// Clover will: `/connect/v1/payments/{id}/receipt` takes EMAIL and SMS. But it
// sends CLOVER's receipt, and Clover's receipt has no line items, because there
// is no Clover order behind this payment — the same constraint that forced the
// custom text receipt in the first place (see receipt.ts).
//
// The whole complaint being answered here is "it needs to have all the detailed
// breakdown on it like we should see in the portal". A customer who picks Email
// and receives a total with no breakdown has been given the old behaviour with
// extra steps. So when we can send it ourselves, we do.
//
// ── AND WHY CLOVER IS STILL THE FALLBACK ──────────────────────────────────
//
// These senders are environment-gated: no RESEND_API_KEY, no email. A facility
// whose deployment has not configured Resend must still be able to hand a
// customer a receipt, so the caller falls back to Clover's own delivery rather
// than failing. Unitemised beats nothing, and the caller reports which of the
// two happened rather than quietly implying the better one.
//
// ── NOTHING HERE MAY AFFECT A PAYMENT ─────────────────────────────────────
//
// Same rule as the printer and the screen: the card is already charged by the
// time any of this runs. Every function returns rather than throws.
// ============================================================================

export interface DeliveryResult {
  sent: boolean;
  /** Why not, when not — logged and shown to staff, never to the customer. */
  detail?: string;
}

/**
 * Email the itemised receipt.
 *
 * @param to the address the CUSTOMER typed on the terminal. Never a stored one:
 *   the person standing at the counter may not be the person on the account,
 *   and the receipt belongs to whoever just paid.
 */
export async function emailItemisedReceipt(
  to: string,
  input: ReceiptInput,
): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, detail: "no email service configured" };
  // A device keyboard produces typos, and Resend answers a malformed address
  // with a 422 that reads like an outage. Refuse it here instead.
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(to)) {
    return { sent: false, detail: "that email address is not valid" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Yipyy <onboarding@resend.dev>",
        to,
        subject: input.reference
          ? `Your receipt from ${input.facility.name} (${input.reference})`
          : `Your receipt from ${input.facility.name}`,
        html: buildReceiptHtml(input),
        // Both parts, always. A text-only client showing an empty message is
        // indistinguishable from a receipt that never arrived.
        text: buildReceiptSmsText(input),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[receipt] email -> ${response.status} ${detail}`.slice(0, 300),
      );
      return { sent: false, detail: `email service said ${response.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.warn("[receipt] email failed:", error);
    return {
      sent: false,
      detail: error instanceof Error ? error.message : "network",
    };
  }
}

/**
 * Text the itemised receipt.
 *
 * ── WHICH TWILIO ACCOUNT ─────────────────────────────────────────────────
 *
 * The PLATFORM one, from the environment. A facility is meant to send from its
 * own subaccount and its own number (20260809200000), but no facility has one
 * provisioned yet — `communication_connections` is empty — so a per-facility
 * lookup would resolve to nothing on every call and the feature would never
 * work. When subaccounts exist this grows a facility branch; until then it
 * sends from Yipyy's number rather than pretending.
 */
export async function smsItemisedReceipt(
  to: string,
  input: ReceiptInput,
): Promise<DeliveryResult> {
  const twilio = platformTwilio();
  const from = platformSendingNumber();
  if (!twilio || !from) {
    return { sent: false, detail: "no SMS service configured" };
  }
  // E.164 or Twilio refuses it. The device may hand back a locally formatted
  // number, so accept digits and normalise a 10-digit North American one.
  const digits = to.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+")
    ? digits
    : digits.length === 10
      ? `+1${digits}`
      : digits.length === 11 && digits.startsWith("1")
        ? `+${digits}`
        : null;
  if (!e164 || !/^\+[1-9]\d{7,14}$/.test(e164)) {
    return { sent: false, detail: "that phone number is not valid" };
  }

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
          To: e164,
          From: from,
          Body: buildReceiptSmsText(input),
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[receipt] sms -> ${response.status} ${detail}`.slice(0, 300),
      );
      return { sent: false, detail: `SMS service said ${response.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.warn("[receipt] sms failed:", error);
    return {
      sent: false,
      detail: error instanceof Error ? error.message : "network",
    };
  }
}

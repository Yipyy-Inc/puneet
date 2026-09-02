import "server-only";

import {
  buildReceiptHtml,
  buildReceiptSmsText,
  type ReceiptInput,
} from "@/lib/clover/receipt";
import { callingProvider } from "@/lib/calling/provider";
import { toE164 } from "@/lib/phone/format";
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
  // `toE164` — the shared one. This function carried a THIRD hand-rolled
  // normaliser: startsWith("+"), else 10 digits, else 11 beginning 1. The
  // "one phone normaliser" change that retired the other two missed it because
  // it was written inline rather than given a name, which is a good argument
  // for naming things.
  const e164 = toE164(to);
  if (!e164) {
    return { sent: false, detail: "that phone number is not valid" };
  }

  const provider = callingProvider();
  if (!provider) return { sent: false, detail: "no SMS service configured" };

  // And through the adapter, which reads the carrier's error code. This path
  // reported `SMS service said 400` — the same sentence whether the customer
  // had replied STOP or the number was mistyped.
  const result = await provider.sendSms(twilio, {
    to: e164,
    from,
    body: buildReceiptSmsText(input),
  });
  return result.ok ? { sent: true } : { sent: false, detail: result.detail };
}

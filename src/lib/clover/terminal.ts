import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { cloverConfig } from "./config";
import { chargeableConnection, validAccessToken } from "./connection";

// ============================================================================
// Taking a card on the facility's own terminal.
//
// Everything here was established against a real Clover Flex 4, because none of
// it is in the documentation and four of the five things that matter would have
// been guessed wrong:
//
//   X-Clover-Device-Id   is the device's SERIAL, not its id. Sending the id
//                        returns "an invalid device serial number [<uuid>]".
//   X-POS-Id             required, and mentioned nowhere until the serial is
//                        right.
//   Idempotency-Key      a HEADER, not a body field.
//   final: true          the field that makes this a SALE. It defaults to
//                        false, which is an adjustable pre-authorisation —
//                        and Canada refuses those outright with "AUTHFeature
//                        is not supported in your region."
//
// ── THE REQUEST IS A LONG POLL, NOT A CALL ────────────────────────────────
//
// Clover holds the connection open while the customer reads the screen, finds
// their card and taps it. The verified sale took SEVENTY SECONDS. That is not a
// timeout to tune down: it is a person at a counter, and shortening it means
// abandoning payments that were about to succeed.
//
// It is why the route sets maxDuration. A default serverless limit kills the
// request mid-payment, and the customer would be charged with nothing recorded.
//
// ── SO THE INTENT MATTERS MORE HERE THAN ANYWHERE ─────────────────────────
//
// The intent is opened BEFORE the device is touched and its id is sent as
// `externalPaymentId`, which Clover stores against the payment and hands back.
// That is the thread that survives everything this flow can do to us — a
// dropped connection, a function timeout, a deploy mid-tap — because the
// payment on Clover's side can always be matched back to the intent that asked
// for it.
// ============================================================================

/** Clover's entryType vocabulary, mapped to the ledger's. */
function entryMethod(entryType: string | undefined): string {
  switch (entryType) {
    case "SWIPED":
      return "swipe";
    case "EMV_CONTACT":
    case "CHIP":
      return "chip";
    case "EMV_CONTACTLESS":
    case "CONTACTLESS":
      return "contactless";
    case "KEYED":
    case "MANUAL":
      return "keyed";
    default:
      // The ledger's CHECK would refuse an unknown string, and a payment must
      // not fail to record because Clover invented a new entry type.
      return "manual";
  }
}

export type DeviceState =
  | { kind: "ready" }
  | { kind: "busy"; detail: string }
  | { kind: "asleep"; detail: string }
  | { kind: "unreachable"; detail: string };

/** Headers every REST Pay Display call needs. */
function payHeaders(
  accessToken: string,
  merchantId: string,
  serial: string,
): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "X-Clover-Merchant-Id": merchantId,
    // The SERIAL. Named "Device-Id", is not the device id.
    "X-Clover-Device-Id": serial,
    "X-POS-Id": "Yipyy",
    Accept: "application/json",
  };
}

/**
 * Is this terminal awake and willing?
 *
 * Answers the question the readiness screen previously had to admit it could
 * not: whether Cloud Pay Display is actually RUNNING. A device that is present
 * but has the app closed answers 504 with, in Clover's own words, "Please
 * manually start Cloud Pay Display on your Clover device and try again" — which
 * is a genuinely useful thing to put in front of a facility.
 */
export async function deviceState(
  facilityId: string,
  serial: string,
): Promise<DeviceState> {
  const connection = await chargeableConnection(facilityId);
  if (!connection) {
    return { kind: "unreachable", detail: "No connected merchant account." };
  }
  const config = cloverConfig(connection.environment);
  const active = await validAccessToken(facilityId);
  if (!config || !active) {
    return { kind: "unreachable", detail: "Clover could not be reached." };
  }

  try {
    const response = await fetch(
      new URL(
        `/connect/v1/device/status?merchant_id=${active.merchantId}`,
        config.apiOrigin,
      ),
      {
        headers: payHeaders(active.accessToken, active.merchantId, serial),
        // Clover's own device timeout is 15s; allow a little more than that so
        // their answer arrives rather than ours.
        signal: AbortSignal.timeout(25_000),
      },
    );
    const body = (await response.json().catch(() => null)) as {
      status?: string;
      message?: string;
    } | null;

    if (response.status === 504) {
      return {
        kind: "asleep",
        detail:
          "The terminal did not answer. Open Cloud Pay Display on it and try again.",
      };
    }
    if (!response.ok) {
      return {
        kind: "unreachable",
        detail: body?.message ?? `Clover answered ${response.status}.`,
      };
    }
    if (body?.status === "IDLE") return { kind: "ready" };
    return {
      kind: "busy",
      detail: `The terminal is ${body?.status ?? "not idle"}.`,
    };
  } catch {
    return { kind: "unreachable", detail: "Could not reach Clover." };
  }
}

export type TerminalOutcome =
  | {
      ok: true;
      paymentId: string;
      intentId: string;
      processorPaymentId: string;
      amountCents: number;
      currency: string;
      cardBrand: string | null;
      cardLast4: string | null;
    }
  | { ok: false; intentId: string | null; code: string; message: string };

interface CloverTerminalPayment {
  payment?: {
    id?: string;
    amount?: number;
    tipAmount?: number;
    result?: string;
    externalPaymentId?: string;
    cardTransaction?: {
      cardType?: string;
      last4?: string;
      entryType?: string;
      authCode?: string;
    };
  };
  message?: string;
  code?: string;
}

export interface TerminalChargeRequest {
  facilityId: string;
  bookingId: string | null;
  clientId: string | null;
  /** Derived server-side from the booking. Never from the client. */
  subtotalCents: number;
  taxCents?: number;
  tipCents?: number;
  /** The device's SERIAL, from facilityTerminals(). */
  deviceSerial: string;
  createdBy: string | null;
  authorName?: string;
}

const MAX_TIP_CENTS = 100_000;

export async function chargeOnTerminal(
  request: TerminalChargeRequest,
): Promise<TerminalOutcome> {
  if (!hasServiceRoleKey()) {
    return {
      ok: false,
      intentId: null,
      code: "not_configured",
      message: "The server cannot record payments.",
    };
  }

  const tipCents = Math.max(0, Math.round(request.tipCents ?? 0));
  const taxCents = Math.max(0, Math.round(request.taxCents ?? 0));
  const subtotalCents = Math.round(request.subtotalCents);

  if (tipCents > MAX_TIP_CENTS) {
    return {
      ok: false,
      intentId: null,
      code: "tip_too_large",
      message: "That tip is larger than we will take in one payment.",
    };
  }

  const amountCents = subtotalCents + taxCents;
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return {
      ok: false,
      intentId: null,
      code: "invalid_amount",
      message: "There is nothing to pay.",
    };
  }

  const connection = await chargeableConnection(request.facilityId);
  if (!connection) {
    return {
      ok: false,
      intentId: null,
      code: "not_connected",
      message: "This facility has not connected a payment account.",
    };
  }
  const config = cloverConfig(connection.environment);
  if (!config) {
    return {
      ok: false,
      intentId: null,
      code: "not_configured",
      message: `Clover is not configured for ${connection.environment}.`,
    };
  }
  if (!connection.currency) {
    return {
      ok: false,
      intentId: null,
      code: "unknown_currency",
      message:
        "We do not know which currency this merchant settles in, so we will not charge a card.",
    };
  }

  const admin = createAdminClient();
  const idempotencyKey = crypto.randomUUID();

  // ── The intent, before the device is touched ─────────────────────────────
  const opened = await admin.rpc("open_payment_intent", {
    p_facility_id: request.facilityId,
    p_amount_cents: amountCents + tipCents,
    p_currency: connection.currency,
    p_kind: "terminal",
    p_idempotency_key: idempotencyKey,
    p_booking_id: request.bookingId,
    p_client_id: request.clientId,
    p_created_by: request.createdBy,
  });
  if (opened.error || !opened.data) {
    return {
      ok: false,
      intentId: null,
      code: "intent_failed",
      message: opened.error?.message ?? "Could not start the payment.",
    };
  }
  const intentId = opened.data as unknown as string;

  const fail = async (
    code: string,
    message: string,
    detail?: string,
  ): Promise<TerminalOutcome> => {
    await admin.rpc("close_payment_intent", {
      p_intent_id: intentId,
      p_status: code === "declined" ? "declined" : "failed",
      p_failure_code: code,
      p_failure_message: detail ?? message,
    });
    return { ok: false, intentId, code, message };
  };

  const active = await validAccessToken(request.facilityId);
  if (!active) {
    return fail(
      "no_token",
      "The connection to Clover could not be refreshed. Reconnect the payment account.",
    );
  }

  await admin.rpc("close_payment_intent", {
    p_intent_id: intentId,
    p_status: "sent",
  });

  let body: CloverTerminalPayment | null;
  let httpStatus: number;
  try {
    const response = await fetch(
      new URL("/connect/v1/payments", config.apiOrigin),
      {
        method: "POST",
        headers: {
          ...payHeaders(
            active.accessToken,
            active.merchantId,
            request.deviceSerial,
          ),
          "Idempotency-Key": idempotencyKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountCents,
          // Clover's own reference to OUR record — what makes a payment
          // findable after any failure on our side.
          //
          // DASHES STRIPPED, and not for tidiness: the field is capped at 32
          // characters and a uuid is 36. Sending the intent id as-is is refused
          // outright with "The externalPaymentId is invalid. It cannot be
          // longer than 32 characters." A uuid without its dashes is exactly
          // 32, loses nothing, and maps back by putting them in again.
          externalPaymentId: intentId.replace(/-/g, ""),
          // A SALE. Without it this is a pre-authorisation, which Canadian
          // merchants cannot take at all.
          final: true,
          ...(tipCents > 0 ? { tipAmount: tipCents } : {}),
        }),
        // Long enough for a person to find their card. The verified sale took
        // seventy seconds.
        signal: AbortSignal.timeout(150_000),
      },
    );
    httpStatus = response.status;
    body = (await response
      .json()
      .catch(() => null)) as CloverTerminalPayment | null;
  } catch {
    // The customer may have paid. The intent survives carrying its id as the
    // externalPaymentId on Clover's side, which is exactly what a later
    // reconciliation matches on.
    return fail(
      "network",
      "We lost contact with the terminal. Check the device before charging again — the payment may have gone through.",
      "The REST Pay Display request did not return. externalPaymentId is the intent id.",
    );
  }

  const payment = body?.payment;
  // NOT `>= 400`. A cancelled payment comes back as HTTP 209 — a status nothing
  // else in this integration uses and no documentation mentions — so success is
  // "there is a payment with an id", and everything else is a failure to
  // classify.
  if (!payment?.id) {
    const code = body?.code ?? `http_${httpStatus}`;
    const message = body?.message ?? "The terminal did not take the payment.";
    // Somebody pressing cancel, or walking away until the device gives up, is
    // not a system failure and must not read like one. Clover reports both the
    // same way: 209 with "The payment request was canceled."
    const cancelled = httpStatus === 209 || /cancel/i.test(message);
    return fail(
      cancelled ? "cancelled" : code,
      cancelled
        ? "The payment was cancelled at the terminal, or nobody presented a card."
        : message,
      // Clover's own words kept on the intent. The friendly sentence above is
      // for the person at the counter; this is for whoever asks later why a
      // payment did not happen, and losing it was the same mistake this
      // integration already made once on the online path.
      `Clover: HTTP ${httpStatus} ${body?.code ?? ""} ${message}`.trim(),
    );
  }

  if (payment.result !== "SUCCESS") {
    return fail(
      "declined",
      "That card was declined. Try another card, or check with the bank.",
      `Clover returned result=${payment.result ?? "unknown"} for ${payment.id}.`,
    );
  }

  // ── The ledger row and the intent link, atomically ───────────────────────
  const recorded = await admin.rpc("record_clover_payment", {
    p_intent_id: intentId,
    p_processor_payment_id: payment.id,
    p_subtotal_cents: subtotalCents,
    p_tax_cents: taxCents,
    // Clover's own figure, not ours — the device may collect a tip we did not
    // ask for.
    p_tip_cents: Math.max(0, Math.round(payment.tipAmount ?? tipCents)),
    p_card_brand: payment.cardTransaction?.cardType ?? null,
    p_card_last4: payment.cardTransaction?.last4 ?? null,
    p_auth_code: payment.cardTransaction?.authCode ?? null,
    p_entry_method: entryMethod(payment.cardTransaction?.entryType),
    p_author_name: request.authorName ?? "Terminal payment",
  });

  if (recorded.error || !recorded.data) {
    await admin
      .from("payment_intents")
      .update({
        status: "approved",
        processor_payment_id: payment.id,
        completed_at: new Date().toISOString(),
      })
      .eq("id", intentId);

    return {
      ok: false,
      intentId,
      code: "unrecorded",
      message:
        "The card was charged on the terminal but the payment could not be written to the ledger. It is flagged for reconciliation.",
    };
  }

  return {
    ok: true,
    paymentId: recorded.data as unknown as string,
    intentId,
    processorPaymentId: payment.id,
    amountCents: (payment.amount ?? amountCents) + (payment.tipAmount ?? 0),
    currency: connection.currency,
    cardBrand: payment.cardTransaction?.cardType ?? null,
    cardLast4: payment.cardTransaction?.last4 ?? null,
  };
}

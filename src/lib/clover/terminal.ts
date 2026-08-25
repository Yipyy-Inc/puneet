import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { cloverConfig } from "./config";
import { chargeableConnection, validAccessToken } from "./connection";
import { createAtomicOrder, type OrderLine } from "./orders";

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
        // MEASURED, not guessed. A healthy device answers in about 8 seconds —
        // this is a round trip to physical hardware, not an API call. A sleeping
        // one costs Clover's own 15-second device timeout before the 504.
        //
        // The first value here was 25s, which reported a perfectly awake
        // terminal as `unreachable` the first time the network was slow. Forty
        // leaves room for that variance while still failing before anybody
        // decides the app has hung.
        signal: AbortSignal.timeout(40_000),
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
      /** "Contactless", "Chip", "Swiped" — what a compliant receipt names. */
      entryMethod: string | null;
      /** The acquirer's approval code, for the same reason. */
      authCode: string | null;
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
  /**
   * What the customer is paying for, for the Clover order.
   *
   * Optional, and a missing list means no order is created — never a failed
   * sale. The lines are read server-side from the booking by the caller, not
   * passed from a browser: an order is a record of what was charged, and a
   * caller that could name its own line items could produce one that disagrees
   * with the payment.
   */
  orderLines?: OrderLine[];
  /** The booking this belongs to, written on the order as a note. */
  orderNote?: string;
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
    // Which terminal took it. The column has existed since intents were added
    // and nothing has ever passed it, so every ledger row so far records the
    // money and not the till.
    p_device_id: request.deviceSerial,
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

  // ── The order, before the money ─────────────────────────────────────────
  //
  // Created here and not after the sale, because `payments` is append-only: the
  // order id has to be on the intent before `record_clover_payment` runs or it
  // can never reach the ledger row at all.
  //
  // The REST Pay Display call below is BYTE-IDENTICAL either way — Clover
  // documents that API as payment-only and it will not accept an order id. So
  // this is a record, giving the merchant's dashboard and Clover's own
  // reporting the line items they otherwise never see.
  //
  // A declined sale leaves an unpaid open order at Clover, which is what a
  // till does: you ring the items up, then the card fails.
  //
  // It cannot cost a sale. `createAtomicOrder` returns null on any failure and
  // never throws, and nothing below reads the result except to record it.
  if (request.orderLines && request.orderLines.length > 0) {
    const orderId = await createAtomicOrder({
      accessToken: active.accessToken,
      merchantId: active.merchantId,
      environment: active.environment,
      lines: request.orderLines,
      taxCents: request.taxCents,
      note: request.orderNote,
    });
    if (orderId) {
      await admin.rpc("name_intent_order", {
        p_intent_id: intentId,
        p_order_id: orderId,
      });
    }
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
    // Already recorded on the payments row above; returned as well so the
    // receipt can carry them without a second read.
    entryMethod: entryMethod(payment.cardTransaction?.entryType),
    authCode: payment.cardTransaction?.authCode ?? null,
    cardLast4: payment.cardTransaction?.last4 ?? null,
  };
}

// ============================================================================
// Giving a card-present payment back, on the device that took it.
//
// ── WHY THIS EXISTS AT ALL ────────────────────────────────────────────────
//
// `/api/payments/clover/refund` sent EVERY refund to the ecommerce
// `/v1/refunds`, card-present ones included, and the debt map recorded that as
// an open question. It is not open any more. Measured against the sandbox on
// 2026-08-25, a partial refund of a terminal payment there is refused:
//
//   HTTP 400 processing_error
//   "Partial refund for order with multiple line items/tip/convenience fee is
//    not supported by this api, Please use /v1/orders/{id}/returns api."
//
// A tip is enough to trigger it, and the terminal asks for a tip. So on a real
// card-present sale the ecommerce endpoint cannot do a partial refund at all.
//
// ── AND WHY NOT THE ENDPOINT THE ERROR RECOMMENDS ─────────────────────────
//
// Because it does not do what it says. Measured the same afternoon:
//
//   POST /v1/orders/{id}/returns  {"amount": 1}         -> 200, refunded 88 of 88
//   POST /v1/orders/{id}/returns  {"items":[{...100}]}  -> 200, refunded 4714 of 4714
//
// Both answered 200. The second ECHOED `"amount": 100` back inside `items`,
// while `amount_returned` said 4714 — it refunds the whole order and reports
// your request back to you. Ask it for $200 of an $800 booking and the customer
// gets $800, with a success response that reads like a partial refund.
//
// `/v1/orders/{id}/returns` is a FULL return wearing a partial's clothes. Do
// not reach for it, whatever Clover's own error message suggests.
//
// ── SO: THE DEVICE, THE WAY THE SALE WENT ─────────────────────────────────
//
// `POST /connect/v1/payments/{id}/refunds` is the documented partial path, and
// it is real: without the serial it answers
// `"Request missing required header: X-Clover-Device-Id"` with
// `requestType: REFUND`, which is Clover confirming the route exists and what
// it wants. With the serial it behaves exactly like taking a payment does —
// including answering 503 when Cloud Pay Display is not running:
//
//   "A connection to your Clover device C0... could not be established. Please
//    manually start (or restart) the Cloud Pay Display application"
//
// That is a real operational condition, not a bug, and it is worth saying
// plainly to whoever is standing at the counter.
// ============================================================================

export type TerminalRefundOutcome =
  | { ok: true; refundId: string | null }
  | { ok: false; code: string; message: string };

/**
 * Refund a payment on the terminal that took it.
 *
 * `amountCents` omitted means the whole thing. Clover treats a full refund of a
 * same-day sale as a VOID, which is cheaper for the merchant — and the ledger
 * learns which of the two happened from `reconcilePayment` reading the payment
 * back, never from what was asked for here.
 */
export async function refundOnTerminal(input: {
  facilityId: string;
  processorPaymentId: string;
  deviceSerial: string;
  amountCents?: number;
  idempotencyKey: string;
}): Promise<TerminalRefundOutcome> {
  const active = await validAccessToken(input.facilityId);
  if (!active) {
    return {
      ok: false,
      code: "not_connected",
      message: "The connection to Clover could not be used.",
    };
  }
  const config = cloverConfig(active.environment);
  if (!config) {
    return {
      ok: false,
      code: "not_configured",
      message: `Clover is not configured for ${active.environment}.`,
    };
  }

  let response: Response;
  try {
    response = await fetch(
      new URL(
        `/connect/v1/payments/${encodeURIComponent(input.processorPaymentId)}/refunds`,
        config.apiOrigin,
      ),
      {
        method: "POST",
        headers: {
          ...payHeaders(
            active.accessToken,
            active.merchantId,
            input.deviceSerial,
          ),
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        // `fullRefund` and `amount` are alternatives, not companions. Sending
        // both is asking two questions at once.
        body: JSON.stringify(
          input.amountCents == null
            ? { fullRefund: true }
            : { amount: input.amountCents },
        ),
        // Shorter than the 150s a SALE gets: a linked refund needs no card
        // presented, only a device awake enough to answer. Long enough that a
        // busy device is not mistaken for an absent one.
        signal: AbortSignal.timeout(60_000),
      },
    );
  } catch {
    return {
      ok: false,
      code: "unreachable",
      message:
        "The terminal did not answer. The outcome of this refund is unknown until it is checked.",
    };
  }

  const body = (await response.json().catch(() => null)) as {
    refund?: { id?: string };
    id?: string;
    message?: string;
    type?: string;
  } | null;

  if (!response.ok) {
    return {
      ok: false,
      // 503 here is Cloud Pay Display being closed, which somebody at the
      // counter can fix in ten seconds if they are told that is the problem.
      code: response.status === 503 ? "device_asleep" : "refused",
      message:
        body?.message ??
        `The terminal refused the refund (${response.status}).`,
    };
  }

  return { ok: true, refundId: body?.refund?.id ?? body?.id ?? null };
}

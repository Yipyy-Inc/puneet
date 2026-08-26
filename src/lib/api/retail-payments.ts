import type { FiservPaymentResponse } from "@/types/payments";
import type { CloverPaymentResponse } from "@/lib/clover-terminal-service";

// ============================================================================
// The counter's card reader, connected to the real one.
//
// `processFiservPayment` and `processCloverPayment` both simulated a charge —
// a 500ms sleep, `Math.random()` for the outcome, an invented transaction id —
// and the retail checkout called them at four places. This is what those call
// sites use now: one POST to `/api/payments/retail/charge`, which runs the same
// `lib/clover/charge.ts` and `lib/clover/terminal.ts` that charge a booking.
//
// ── IT ANSWERS IN THE SHAPE THE OLD ONES DID, DELIBERATELY ────────────────
//
// The checkout branches on `success`, reads `error.message`, and stores
// `transactionId` / `cloverTransactionId` on the transaction it records. Those
// keys are kept so the swap is one line per call site, in a 5,000-line file
// where a wider edit is how a split-payment loop quietly starts settling the
// wrong instalment.
//
// The ids are real now: `transactionId` is the `payments` row's uuid and
// `cloverTransactionId` is Clover's own payment id, so a figure on this screen
// can be traced to a row in the ledger and a transaction in the merchant's
// dashboard. The simulators produced `txn_<timestamp>_<random>`, which could be
// traced to nothing.
// ============================================================================

export interface RetailChargeInput {
  amountCents: number;
  taxCents?: number;
  tipCents?: number;
  /** The customer's ref, when the till knows who is buying. */
  clientRef?: number | null;
  /** Card-not-present: the `clv_` token from the hosted fields. */
  source?: string;
  /** Card-present: the terminal's SERIAL. Exactly one of the two. */
  deviceSerial?: string;
  lines?: { name: string; unitPriceCents: number; quantity: number }[];
  note?: string;
}

interface RetailChargeOk {
  paymentId: string;
  processorPaymentId: string;
  amountCents: number;
  cardBrand: string | null;
  cardLast4: string | null;
}

/**
 * Take a retail payment. Never throws — the checkout reads `success`.
 *
 * A thrown error here would abandon a split-payment loop midway with earlier
 * instalments already charged, so a failure is returned as a value the same way
 * the functions this replaced did.
 */
export async function chargeRetail(
  input: RetailChargeInput,
): Promise<FiservPaymentResponse & { cloverTransactionId: string }> {
  const at = new Date().toISOString();
  const failed = (
    code: string,
    message: string,
    status: FiservPaymentResponse["status"] = "failed",
  ) =>
    ({
      success: false,
      transactionId: "",
      fiservTransactionId: "",
      cloverTransactionId: "",
      amount: input.amountCents / 100,
      currency: "CAD" as const,
      status,
      error: { code, message },
      processedAt: at,
    }) satisfies FiservPaymentResponse & { cloverTransactionId: string };

  let response: Response;
  try {
    response = await fetch("/api/payments/retail/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subtotalCents: Math.round(input.amountCents),
        taxCents: Math.round(input.taxCents ?? 0),
        tipCents: Math.round(input.tipCents ?? 0),
        clientRef: input.clientRef ?? null,
        ...(input.source ? { source: input.source } : {}),
        ...(input.deviceSerial ? { deviceSerial: input.deviceSerial } : {}),
        lines: input.lines ?? [],
        ...(input.note ? { note: input.note } : {}),
      }),
    });
  } catch {
    // The card may or may not have been charged. Said plainly rather than
    // reported as a decline, which would invite somebody to charge again.
    return failed(
      "unreachable",
      "The payment could not be sent. Check the terminal before charging again.",
    );
  }

  const body = (await response.json().catch(() => null)) as
    | (Partial<RetailChargeOk> & { error?: string; code?: string })
    | null;

  if (!response.ok || !body?.paymentId) {
    return failed(
      body?.code ?? "refused",
      body?.error ?? `The payment did not go through (${response.status}).`,
      response.status === 402 ? "declined" : "failed",
    );
  }

  return {
    success: true,
    // The ledger row, not an invented string.
    transactionId: body.paymentId,
    fiservTransactionId: body.processorPaymentId ?? "",
    cloverTransactionId: body.processorPaymentId ?? "",
    amount: (body.amountCents ?? input.amountCents) / 100,
    currency: "CAD",
    status: "completed",
    cardBrand: body.cardBrand ?? undefined,
    cardLast4: body.cardLast4 ?? undefined,
    processedAt: at,
  };
}

/** The same call, answering in the Clover terminal shape the checkout expects. */
export async function chargeRetailOnTerminal(
  input: RetailChargeInput & { deviceSerial: string },
): Promise<CloverPaymentResponse> {
  const out = await chargeRetail(input);
  const total = (input.amountCents + (input.tipCents ?? 0)) / 100;
  return {
    success: out.success,
    transactionId: out.transactionId,
    cloverTransactionId: out.cloverTransactionId,
    amount: input.amountCents / 100,
    tipAmount: (input.tipCents ?? 0) / 100,
    totalAmount: total,
    currency: "CAD",
    // The device reports how the card was read; this shape wants one of three
    // and the ledger keeps the real value on `payments.entry_method`. "tap" is
    // the common case and is only ever shown as a label.
    paymentMethod: "tap",
    cardBrand: out.cardBrand,
    cardLast4: out.cardLast4,
    status: out.success ? "completed" : "failed",
    // The terminal route prints its own receipt; this one does not, and says so
    // rather than claiming a slip nobody produced.
    receiptPrinted: false,
    error: out.error,
    processedAt: out.processedAt,
  } as CloverPaymentResponse;
}

/**
 * A refusal in the shape the checkout already handles.
 *
 * No throw, so a split-payment loop can stop without unwinding instalments that
 * have already charged, and the message reaches the operator the same way a
 * decline does.
 */
export function refusedPayment(
  amountCents: number,
  code: string,
  message: string,
): FiservPaymentResponse {
  return {
    success: false,
    transactionId: "",
    fiservTransactionId: "",
    amount: amountCents / 100,
    currency: "CAD",
    status: "failed",
    error: { code, message },
    processedAt: new Date().toISOString(),
  };
}

/**
 * The answer for a card already ON FILE for this customer.
 *
 * There isn't one, and this says so rather than simulating it. The saved cards
 * this screen offers come from `mockTokenizedCards` in `src/data/fiserv-
 * payments.ts` and carry a `fiservToken` — a fixture string for a processor
 * this deployment has no account with. There is nothing behind them to charge.
 *
 * Charging a stored card at Clover is a real thing, and a different one: the
 * card has to have been vaulted AT CLOVER when it was first taken, and the
 * charge names that stored id. Neither half exists yet. Until a saved card is a
 * Clover customer's card rather than a fixture, this is the honest answer.
 *
 * TYPED cards are real now — `chargeRetail` with a `clv_` token from the hosted
 * fields. This refusal is only about cards on file.
 *
 * Returned as a normal failed response, in the shape the checkout already
 * handles, so the refusal travels the same path a decline would: no throw, no
 * abandoned split-payment loop, and the message reaches the operator.
 */
export function savedCardUnavailable(
  amountCents: number,
): FiservPaymentResponse {
  return refusedPayment(
    amountCents,
    "saved_card_unsupported",
    "A card on file cannot be charged — those are not real stored cards. Ask for the card and enter it below, or take it on the terminal.",
  );
}

// ============================================================================
// Giving it back.
//
// The return screen could apply every refund rule the facility has and then not
// refund anything — it recorded the return and told the operator to walk to the
// terminal. That was honest while a retail sale was a fixture with nothing at a
// processor behind it. It has not been true since `/api/payments/retail/charge`
// started writing real `payments` rows, so these two close it: one lists the
// sales that actually exist, the other reverses one.
// ============================================================================

export interface RetailSale {
  paymentId: string;
  /** Null on a cash or store-credit sale — nothing at a processor to reverse. */
  processorPaymentId: string | null;
  /** Whether this could go back on a card at all. */
  refundableToCard: boolean;
  amountCents: number;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  /** What is left after anything already given back. Zero means done. */
  refundableCents: number;
  method: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  entryMethod: string | null;
  /** Card-present: it has to go back through the device that took it. */
  onDevice: boolean;
  soldBy: string | null;
  note: string | null;
  clientId: string | null;
  clientRef: number | null;
  clientName: string | null;
  createdAt: string;
}

export const retailSaleQueries = {
  all: () => ({
    queryKey: ["retail", "sales"] as const,
    queryFn: async (): Promise<RetailSale[]> => {
      const response = await fetch("/api/payments/retail/sales");
      if (!response.ok) return [];
      const body = (await response.json()) as { sales?: RetailSale[] };
      return body.sales ?? [];
    },
  }),
};

export type RetailRefundOutcome =
  | { ok: true; refundedCents: number; shortfallCents: number }
  | { ok: false; message: string };

/**
 * Reverse a counter sale at Clover. Never throws — the caller reads `ok`.
 *
 * The same discipline `chargeRetail` follows and for the same reason: a return
 * handler that throws mid-way abandons the store-credit and gift-card steps
 * after the card has already been credited.
 */
export async function refundRetailSale(input: {
  paymentId: string;
  amountCents?: number;
  reason?: string;
}): Promise<RetailRefundOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/payments/retail/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId: input.paymentId,
        ...(input.amountCents
          ? { amountCents: Math.round(input.amountCents) }
          : {}),
        ...(input.reason ? { reason: input.reason } : {}),
      }),
    });
  } catch {
    // The refund may or may not have been made. Said plainly, because the one
    // thing that must not happen next is somebody refunding it a second time.
    return {
      ok: false,
      message:
        "The refund could not be sent. Check Clover before refunding this sale again.",
    };
  }

  const body = (await response.json().catch(() => null)) as {
    refunded?: boolean;
    refundedCents?: number;
    shortfallCents?: number;
    error?: string;
  } | null;

  if (!response.ok || !body?.refunded) {
    return {
      ok: false,
      message:
        body?.error ?? `The refund did not go through (${response.status}).`,
    };
  }

  return {
    ok: true,
    refundedCents: body.refundedCents ?? 0,
    shortfallCents: body.shortfallCents ?? 0,
  };
}

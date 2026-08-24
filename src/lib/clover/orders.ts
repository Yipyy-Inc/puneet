import "server-only";

import { cloverConfig, type CloverEnvironment } from "./config";

// ============================================================================
// Telling Clover what was sold, not just how much.
//
// ── WHY THERE WAS NO ORDER ────────────────────────────────────────────────
//
// Both money paths sent a bare amount:
//
//   terminal.ts   { amount, externalPaymentId, final, tipAmount? }
//   charge.ts     { amount, currency, source, ecomind, capture }
//
// Clover prints, reports and displays what is on the ORDER. With no order and
// no line items, the device has one number to print, the merchant dashboard
// shows a total with no idea what it was for, and Clover's own reporting cannot
// tell a boarding week from a nail trim.
//
// ── AND WHY THE ORDER CANNOT ALWAYS CARRY THE PAYMENT ─────────────────────
//
// Clover documents the REST Pay Display API — the one that drives a
// semi-integrated terminal — as payment-only, and says it "does not support
// passing an order ID or item ID directly". That is Clover's limitation, not a
// gap here, and no amount of work in this file changes it.
//
// Online is different: Clover DOES support a real link, via
// POST /v1/orders/{orderId}/pay on the same Ecommerce host and the same `clv_`
// token the charge already uses. **That is not built.** It changes how money is
// taken, and it could not be proven — the sandbox merchant's access token had
// expired, refreshing it outside the app would invalidate the stored refresh
// token because Clover rotates them, and that merchant's only members are
// production identities so the app's own refresh path is unreachable from a
// local run. Shipping an unverified change to a live money path is the one
// thing this integration has consistently refused to do.
//
// So on BOTH paths today the order is a RECORD: created before the charge so
// its id can reach the append-only ledger row, and the payment call itself
// unchanged. The merchant's dashboard and Clover's reporting gain the line
// items; Clover's internal payment→order link is still only available online
// and still waiting on one browser session against the sandbox.
//
// ── AN ORDER MUST NEVER COST A SALE ───────────────────────────────────────
//
// Every function here returns null instead of throwing, has a short timeout and
// no retries. That is the same rule print.ts follows and for the same measured
// reason: a sale that succeeded with no paper is a nuisance; a sale reported as
// failed because a second request failed is a double charge.
//
// The callers are written so that a null order falls back to the behaviour that
// exists today. Nobody's card gets declined because Clover's order service was
// slow.
// ============================================================================

/** Short. An order is a nicety and a sale is not. */
const TIMEOUT_MS = 8_000;

export interface OrderLine {
  /** What the customer sees on the receipt. */
  name: string;
  /** Cents. Clover calls this `price` and means the line total per unit. */
  unitPriceCents: number;
  quantity: number;
}

export interface OrderRequest {
  accessToken: string;
  merchantId: string;
  environment: CloverEnvironment;
  lines: OrderLine[];
  /** Cents. Sent as its own line so the receipt adds up to what was charged. */
  taxCents?: number;
  /** Free text on the order — the booking this belongs to. */
  note?: string;
}

interface CloverOrder {
  id?: string;
  total?: number;
}

/**
 * One order, with its line items, in a single call.
 *
 * `atomic_order` rather than creating an order and then POSTing line items one
 * at a time: a half-built order left behind by a failure between the two is a
 * row in the merchant's dashboard that nobody can explain.
 */
export async function createAtomicOrder(
  request: OrderRequest,
): Promise<string | null> {
  const config = cloverConfig(request.environment);
  if (!config) return null;
  if (request.lines.length === 0) return null;

  const lineItems = request.lines.flatMap((line) =>
    // Clover has no quantity on an ad-hoc line item; a quantity of three is
    // three line items. Expanding here keeps the receipt honest rather than
    // silently charging one and printing three.
    Array.from({ length: Math.max(1, Math.round(line.quantity)) }, () => ({
      name: line.name.slice(0, 127),
      price: Math.max(0, Math.round(line.unitPriceCents)),
      printed: true,
    })),
  );

  if (request.taxCents && request.taxCents > 0) {
    lineItems.push({
      name: "Tax",
      price: Math.round(request.taxCents),
      printed: true,
    });
  }

  try {
    const response = await fetch(
      new URL(
        `/v3/merchants/${request.merchantId}/atomic_order/orders`,
        config.apiOrigin,
      ),
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${request.accessToken}`,
          "Content-Type": "application/json",
          "X-Clover-Merchant-Id": request.merchantId,
        },
        body: JSON.stringify({
          orderCart: {
            lineItems,
            ...(request.note ? { note: request.note.slice(0, 255) } : {}),
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );

    if (!response.ok) return null;
    const order = (await response
      .json()
      .catch(() => null)) as CloverOrder | null;
    return order?.id ?? null;
  } catch {
    // Deliberately silent to the caller. Every call site treats null as "no
    // order this time" and carries on with the sale.
    return null;
  }
}

/** The lines a booking's receipt should carry, from what it is actually made of. */
export function linesFromBill(
  bill: { name: string; priceCents: number; quantity?: number }[],
): OrderLine[] {
  return bill
    .filter((entry) => entry.name.trim().length > 0)
    .map((entry) => ({
      name: entry.name.trim(),
      unitPriceCents: Math.max(0, Math.round(entry.priceCents)),
      quantity: Math.max(1, Math.round(entry.quantity ?? 1)),
    }));
}

// ============================================================================
// What a Clover reversal is worth, and how it splits.
//
// Pure arithmetic, deliberately in its own file with NO imports — not
// `server-only`, not Supabase, not `fetch`. `reconcile.ts` cannot be loaded
// outside a server request, so anything living in it cannot be asserted
// directly; this is the part that decides how much money a booking is shown as
// having been given back, and it is the part most worth pinning.
//
// Exercised by `tests/e2e/clover-reversal.spec.ts`, which runs in the push gate
// and drives these functions with no browser and no network.
// ============================================================================

/** One element of `payment.refunds.elements`, as Clover actually sends it. */
export interface CloverRefundElement {
  id?: string;
  amount?: number;
  /** "SUCCESS" on a refund that returned money. Absent in older payloads. */
  status?: string;
  /** True once the refund has itself been reversed. */
  voided?: boolean;
}

/** The money components of the payment being reversed, in cents. */
export interface Components {
  subtotal: number;
  tax: number;
  tip: number;
  grandTotal: number;
}

/** Cents actually returned by one refund element. */
export function refundCents(refund: CloverRefundElement): number {
  return Math.max(0, Math.round(Number(refund.amount ?? 0)));
}

/**
 * The refunds that returned money, from the ones Clover merely lists.
 *
 * ── THE SAME TRAP AS `payment.result`, ONE LEVEL DOWN ─────────────────────
 *
 * `reconcile.ts` has filtered payments on `result === "SUCCESS"` since a pair
 * of DECLINED $62.50 cards were once offered on screen as money to attach. The
 * lesson was never applied to the refunds hanging off a payment: every element
 * was summed, whatever its status. A FAILED refund, or one that has since been
 * voided, would be counted as money given back — so the ledger records a
 * reversal that never happened, the booking says the customer was repaid, and
 * the facility is out of pocket by the amount.
 *
 * A MISSING status is treated as SUCCESS. Every payload measured carries the
 * field, and refusing a refund because an API version omitted it would
 * under-report a real reversal — which is the error that leaves a customer out
 * of pocket instead. Present-and-not-SUCCESS is not money; `voided` is never.
 */
export function settledRefunds(
  elements: CloverRefundElement[] | undefined,
): CloverRefundElement[] {
  return (elements ?? []).filter(
    (refund) =>
      (refund.status ?? "SUCCESS").toUpperCase() === "SUCCESS" &&
      refund.voided !== true,
  );
}

/**
 * How much of a reversal is subtotal, how much tax, how much tip.
 *
 * ── WHY THIS IS NOT A COSMETIC CHOICE ─────────────────────────────────────
 *
 * It decides the booking's balance. `private.booking_amount_paid` is
 *
 *     sum(grand_total - tip - tax)
 *
 * so every cent placed on `subtotal` moves what the customer is shown as owing,
 * and every cent placed on tax or tip does not.
 *
 * Until 2026-08-26 a partial reversal was written as `subtotal: -gap, tax: 0,
 * tip: 0`, and the outcome string called that a labelling caveat. It was a
 * balance error: a manager refunding a $20 TIP inside Clover dropped
 * `amount_paid` by $20 and flipped a fully-paid booking into owing $20 that
 * nobody owed.
 *
 * Clover does not say how a refund splits — measured, not assumed. A real
 * refund element is `{id, amount, status, voided, payment, orderRef, …}`; it
 * carries no tax or tip of its own, and the nested `payment` holds the
 * ORIGINAL's, not this refund's share. So the split is DERIVED, in proportion
 * to the payment being reversed. Not certainly right — a genuine tip-only
 * refund is still spread across all three — but the error is bounded by the
 * original's own proportions rather than being maximal in precisely the case
 * that used to be worst.
 *
 * The subtotal absorbs the rounding remainder, so the three components always
 * sum to the amount and `grand_total` is exact to the cent.
 */
export function allocate(
  amount: number,
  of: Components,
): { subtotal: number; tax: number; tip: number; total: number } {
  // ── THE ZERO GUARD COMES FIRST, AND THE ORDER IS THE POINT ──────────────
  //
  // Written the other way round it looked equivalent and was not: `amount >= 0`
  // is true for every amount, so a zero-total original returned ITS OWN
  // components — all zeros — while still claiming `total: amount`. The row's
  // parts then disagreed with its own `grand_total`, which is the one thing a
  // money row may never do. Caught by the "components always sum" case in
  // clover-reversal.spec.ts on the first run.
  if (of.grandTotal <= 0) {
    return { subtotal: amount, tax: 0, tip: 0, total: amount };
  }
  if (amount >= of.grandTotal) {
    // The whole payment: mirrored exactly, so tax and tip come back as they
    // went out and no proportion has to be invented at all.
    return { subtotal: of.subtotal, tax: of.tax, tip: of.tip, total: amount };
  }
  const tax = Math.round((of.tax * amount) / of.grandTotal);
  const tip = Math.round((of.tip * amount) / of.grandTotal);
  return { subtotal: amount - tax - tip, tax, tip, total: amount };
}

/**
 * Which reversals to write, and for how much, given what the ledger already has.
 *
 * ── ONE ROW PER THING CLOVER ACTUALLY DID ─────────────────────────────────
 *
 * A void is one event and gets one row. A set of refunds is N events and gets N
 * rows, each carrying ITS OWN Clover id.
 *
 * This is the fix. Before it, a single row was written for the whole shortfall
 * and identified with `refunds.elements[0].id` — the FIRST refund, whatever the
 * reversal being recorded actually was. `payments_processor_identity` is unique
 * on `(processor, processor_payment_id)`, so a second partial refund collided
 * with the first and the insert was REFUSED:
 *
 *   "Clover reversed 1000 cents but the ledger refused the row: duplicate key
 *    value violates unique constraint payments_processor_identity"
 *
 * Two of those sat in `payment_webhook_events` from 8 August. Whether it healed
 * was luck: a later refund could shift `elements[0]` and let the next attempt
 * through, and with no later refund the money was never recorded at all and the
 * booking overstated what it held, permanently.
 *
 * Keyed individually, the unique index stops being a hazard and becomes the
 * idempotency guarantee — a replayed webhook is refused for the right reason,
 * on the right row, which is why the caller reads 23505 as "already recorded".
 *
 * ── THE GAP IS A CEILING, AND IT HAS TO BE ────────────────────────────────
 *
 * Payments reversed BEFORE this change carry one aggregate row naming no
 * individual refund, so every refund id looks unrecorded. Capping the total by
 * the outstanding gap is what stops those being written a second time and
 * double-counting money the ledger already holds.
 */
export function reversalsToRecord(input: {
  /** True when the whole payment was voided rather than refunded. */
  voided: boolean;
  /** Clover's id for the void itself, when there is one. */
  voidReference?: string;
  /** The payment's own id — the last resort identity for a void. */
  paymentId: string;
  /** Refund elements, already filtered by `settledRefunds`. */
  refunds: CloverRefundElement[];
  /** Clover total minus ledger total, in cents. Always positive here. */
  gap: number;
  /** Clover ids the ledger can already name. */
  alreadyRecorded: ReadonlySet<string>;
}): { reference: string; amount: number }[] {
  const out: { reference: string; amount: number }[] = [];
  let remaining = input.gap;

  if (input.voided) {
    return [
      { reference: input.voidReference ?? input.paymentId, amount: remaining },
    ];
  }

  for (const refund of input.refunds) {
    if (remaining <= 0) break;
    const reference = refund.id;
    // Never an id we invent: a made-up identity is one a real delivery could
    // later collide with. Without one there is nothing to key on, and the gap
    // arithmetic brings it back on the next sweep.
    if (!reference || input.alreadyRecorded.has(reference)) continue;
    const amount = Math.min(refundCents(refund), remaining);
    if (amount <= 0) continue;
    out.push({ reference, amount });
    remaining -= amount;
  }

  return out;
}

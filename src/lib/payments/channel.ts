// ============================================================================
// How a payment was taken — one answer, from the most truthful signal available.
//
// A Yipyy payment is ONE object (`public.payments`) whether the card was tapped
// on a Clover reader or typed into a browser. What differs is the CHANNEL, and
// until 2026-08-26 that was decided inline in the transactions route from
// `payments.method` — a Yipyy-side label chosen by whoever recorded the money,
// not an account of what actually happened.
//
// ── WHAT THE LEDGER ACTUALLY CONTAINS ─────────────────────────────────────
//
// Measured on 2026-08-26 against production, because the rule was written from
// the column names first and the data disagreed:
//
//   581 of 612 rows have `processor IS NULL`. They are RECORDED payments —
//   cash, e-transfer, and cards a staff member noted at the counter — not
//   payments Yipyy processed. Nothing in them says which channel took the card.
//
//   206 of those carry `method` of `new-card` or `card-on-file`, and the old
//   rule reported every one of them as "Online". They never touched the
//   Ecommerce API. That is the bug this file exists to fix.
//
//   `processor_device_serial` is NULL on every row, including the swipe and
//   contactless ones. It was added to the schema long before anything passed
//   it, so it cannot corroborate anything and is deliberately not read here.
//
// ── SO: PROCESSED ROWS ARE ASKED, RECORDED ROWS ARE NOT ───────────────────
//
// When Clover handled the money it also told us how, in `entry_method`, and
// that is believed over everything else. When it did not, the channel is
// genuinely unknown for a card and "other" is the honest answer — the tender
// itself is still shown in the Card column beside it, so nothing is hidden.
//
// The three values are the ones the Transactions tab has always rendered
// (`in_person` / `online` / `other`, see TransactionsTable.tsx). Renaming them
// would churn the table, its filter and its labels to say the same thing.
// ============================================================================

export type PaymentChannel = "in_person" | "online" | "other";

/** The columns this decision needs. A `payments` row, narrowed. */
export interface ChannelFacts {
  /** `"clover"` when Yipyy processed it; null when somebody recorded it. */
  processor: string | null;
  /** How the processor says the card was presented. `"ecom"` is online. */
  entry_method: string | null;
  /** Yipyy's own label for the tender. The weakest signal, used last. */
  method: string | null;
}

/**
 * Clover's own words for a card that was physically present.
 *
 * `keyed` belongs here: a number typed into a terminal at the counter is
 * card-present by the card brands' reckoning, and it is priced that way.
 */
const CARD_PRESENT_ENTRY = new Set([
  "chip",
  "swipe",
  "contactless",
  "emv",
  "keyed",
  "manual",
]);

/**
 * Which channel took this payment.
 *
 * Never throws and never returns null — a row with nothing readable is
 * `"other"`, which is exactly what it is.
 */
export function paymentChannel(row: ChannelFacts): PaymentChannel {
  const entry = row.entry_method?.trim().toLowerCase();
  const method = row.method?.trim().toLowerCase();

  // ── 1. Yipyy processed it, so Clover can be asked ───────────────────────
  if (row.processor) {
    if (entry === "ecom") return "online";
    if (entry && CARD_PRESENT_ENTRY.has(entry)) return "in_person";
    // Processed but unlabelled. The path that took it still knows: the
    // terminal route opens its intent with kind `terminal`, and that is what
    // `method` carries through.
    if (method === "terminal") return "in_person";
    return "online";
  }

  // ── 2. Nobody processed it. It was written down ─────────────────────────
  //
  // `terminal` is the one recorded method that names a channel: somebody is
  // saying they took it on a card reader. Every other recorded method —
  // including `new-card` and `card-on-file` — says WHAT was tendered and
  // nothing about where. Reporting those as "Online" is a claim the row does
  // not support, and it was being made 206 times.
  if (method === "terminal") return "in_person";
  return "other";
}

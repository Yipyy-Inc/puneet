import "server-only";

import type { PayoutSchedule } from "@/lib/settings/yipyy-pay";

// ============================================================================
// What is on its way to the facility's bank, estimated from our own ledger.
//
// ── WHY THIS IS DERIVED AND NOT FETCHED ───────────────────────────────────
//
// Clover publishes no payout or settlement endpoint to an OAuth application.
// Checked against their reference: a merchant's deposits are visible in their
// own Clover dashboard and nowhere an integration can reach. So the choice is
// between showing nothing and showing a number Yipyy can actually justify.
//
// Yipyy already records every card payment and every reversal it took — that
// is what `public.payments` is. Netting a day's card takings gives the amount
// that will settle for that day, which is the same arithmetic the facility
// would do by hand and correct except at the edges Clover owns: an unusual
// hold, a chargeback, a processing fee deducted at source.
//
// ── SO IT IS CALLED AN ESTIMATE, EVERYWHERE, IN THE UI ────────────────────
//
// Not as a disclaimer. A facility reconciling a bank statement has to know
// which of the two numbers is authoritative, and it is not this one. Every
// screen rendering these carries the word and a link to Clover.
//
// ── ONLY CARD MONEY ───────────────────────────────────────────────────────
//
// Cash never lands in a payout, and neither does store credit, a package pass
// or a loyalty discount — those are already netted into `grand_total` by the
// time a row exists. The caller filters on `processor = 'clover'`, which is
// the only tender that reaches a merchant account at all.
// ============================================================================

/** A day's card takings and when they should land. */
export interface EstimatedPayout {
  /** The business day the transactions were taken, as YYYY-MM-DD. */
  takenOn: string;
  /** Net of refunds, in cents. Never negative — see `estimatePayouts`. */
  amountCents: number;
  /** How many payment rows contributed. Refunds count toward this. */
  transactions: number;
  /** Estimated bank arrival, as YYYY-MM-DD. */
  expectedOn: string;
}

/** A payment row, reduced to the three things a payout cares about. */
export interface PayoutInput {
  /** ISO timestamp from `payments.created_at`. */
  createdAt: string;
  /**
   * `payments.grand_total` in cents.
   *
   * ALREADY NEGATIVE on a refund row — a reversal is stored as its own payment
   * pointing at the one it reverses, and sign-flipping it here would add back
   * the money the facility gave away. The same trap the client billing tab hit.
   */
  amountCents: number;
}

/** Saturday or Sunday, in the facility's own timezone. */
function isWeekend(day: Date): boolean {
  const weekday = day.getUTCDay();
  return weekday === 0 || weekday === 6;
}

/** YYYY-MM-DD for a Date already shifted into the facility's timezone. */
function isoDay(day: Date): string {
  return day.toISOString().slice(0, 10);
}

/**
 * The calendar day a timestamp falls on **where the facility is**.
 *
 * A payment taken at 8pm in Montreal is on the next UTC day, and bucketing by
 * UTC would put a Monday evening's takings into Tuesday's payout — an
 * off-by-one that a facility reconciling a statement would see immediately and
 * have no way to explain. The same class of bug that once dropped every night
 * shift out of its own day on the roster.
 */
function localDay(timestamp: string, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00Z`);
}

/** Add N business days, skipping weekends. Bank holidays are not modelled. */
function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (!isWeekend(result)) remaining -= 1;
  }
  return result;
}

/**
 * How many business days a schedule takes to reach the bank.
 *
 * Two for standard rather than the "2–3 business days" the copy quotes: the
 * estimate should land on the OPTIMISTIC end, because a facility that sees
 * money arrive a day early is not confused, and one who sees a date come and go
 * raises a support ticket. The copy still says 2–3 so nobody is surprised.
 */
function daysToBank(schedule: PayoutSchedule): number {
  return schedule === "next_day" ? 1 : 2;
}

/**
 * The payouts still on their way, soonest first.
 *
 * A day whose estimated arrival has already passed is dropped: that money is in
 * the bank, and listing it under "upcoming" would have a facility waiting for a
 * deposit they have already had.
 *
 * A day that nets to zero or below — every card payment refunded — is dropped
 * too. Clover does not send a payout for it, and a £0.00 row invites the reader
 * to wonder what went wrong when nothing did.
 *
 * @param today the caller's "now", passed in rather than read here so the
 *   result is a pure function of its inputs and a test can pin the date.
 */
export function estimatePayouts(
  payments: PayoutInput[],
  schedule: PayoutSchedule,
  timeZone: string,
  today: Date,
  limit = 2,
): EstimatedPayout[] {
  const lag = daysToBank(schedule);
  const todayIso = isoDay(localDay(today.toISOString(), timeZone));

  const byDay = new Map<
    string,
    { amountCents: number; transactions: number }
  >();
  for (const payment of payments) {
    const day = localDay(payment.createdAt, timeZone);
    const key = isoDay(day);
    const bucket = byDay.get(key) ?? { amountCents: 0, transactions: 0 };
    bucket.amountCents += payment.amountCents;
    bucket.transactions += 1;
    byDay.set(key, bucket);
  }

  return [...byDay.entries()]
    .map(([takenOn, bucket]) => ({
      takenOn,
      amountCents: bucket.amountCents,
      transactions: bucket.transactions,
      expectedOn: isoDay(
        addBusinessDays(new Date(`${takenOn}T00:00:00Z`), lag),
      ),
    }))
    .filter((payout) => payout.amountCents > 0 && payout.expectedOn >= todayIso)
    .sort((a, b) => a.expectedOn.localeCompare(b.expectedOn))
    .slice(0, limit);
}

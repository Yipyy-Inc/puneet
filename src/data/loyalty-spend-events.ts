/**
 * Mock per-customer revenue ledger — one row per booking/invoice the customer
 * paid, with a date and dollar amount. In production this is the payments /
 * invoices ledger; here it is a deterministic monthly series so the analytics
 * reports (badge revenue-uplift, member spend-over-time) have real numbers to
 * work with. The earliest event for a customer doubles as their first-booking
 * date for "time to earn" analytics.
 *
 * Generated, not hand-written, to keep the file compact and self-consistent —
 * but fully static (no Date.now()/random), so every render sees identical data.
 */

export interface LoyaltySpendEvent {
  id: string;
  facilityId: number;
  customerId: number;
  /** ISO timestamp the customer paid. */
  date: string;
  /** Dollars spent. */
  amount: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Inclusive month key "YYYY-MM" → absolute month index for comparison. */
function monthIndex(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return y * 12 + (m - 1);
}

/**
 * One paid event on the 14th of every month from `start` to `end` (inclusive).
 * The monthly amount is `base`, stepping up to `round(base * upliftMultiplier)`
 * once the month reaches `upliftFrom` — modelling the spend bump after a
 * customer becomes more engaged.
 */
function monthlyLedger(opts: {
  facilityId: number;
  customerId: number;
  start: string;
  end: string;
  base: number;
  upliftFrom?: string;
  upliftMultiplier?: number;
}): LoyaltySpendEvent[] {
  const startIdx = monthIndex(opts.start);
  const endIdx = monthIndex(opts.end);
  const upliftIdx = opts.upliftFrom ? monthIndex(opts.upliftFrom) : Infinity;
  const events: LoyaltySpendEvent[] = [];
  for (let idx = startIdx; idx <= endIdx; idx++) {
    const year = Math.floor(idx / 12);
    const month = (idx % 12) + 1;
    const uplifted = idx >= upliftIdx;
    const amount = uplifted
      ? Math.round(opts.base * (opts.upliftMultiplier ?? 1))
      : opts.base;
    events.push({
      id: `spend-${opts.customerId}-${year}${pad(month)}`,
      facilityId: opts.facilityId,
      customerId: opts.customerId,
      date: `${year}-${pad(month)}-14T12:00:00Z`,
      amount,
    });
  }
  return events;
}

export const loyaltySpendEvents: LoyaltySpendEvent[] = [
  // Alice Johnson (15) — long-tenured, big spend bump after first badge.
  ...monthlyLedger({
    facilityId: 1,
    customerId: 15,
    start: "2025-09",
    end: "2026-05",
    base: 110,
    upliftFrom: "2026-02",
    upliftMultiplier: 1.6,
  }),
  // Mike (2) — steady, moderate bump.
  ...monthlyLedger({
    facilityId: 1,
    customerId: 2,
    start: "2025-11",
    end: "2026-05",
    base: 70,
    upliftFrom: "2026-03",
    upliftMultiplier: 1.5,
  }),
  // Customer 7 — newer, recent bump.
  ...monthlyLedger({
    facilityId: 1,
    customerId: 7,
    start: "2026-01",
    end: "2026-05",
    base: 60,
    upliftFrom: "2026-05",
    upliftMultiplier: 1.3,
  }),
  // Max (22) — oldest & highest spender, earned every badge.
  ...monthlyLedger({
    facilityId: 1,
    customerId: 22,
    start: "2025-06",
    end: "2026-05",
    base: 180,
    upliftFrom: "2025-12",
    upliftMultiplier: 1.5,
  }),
  // Customer 9 — low engagement, no badges, flat spend.
  ...monthlyLedger({
    facilityId: 1,
    customerId: 9,
    start: "2025-12",
    end: "2026-05",
    base: 40,
  }),
  // Customer 31 — mid-tier, modest bump.
  ...monthlyLedger({
    facilityId: 1,
    customerId: 31,
    start: "2025-10",
    end: "2026-05",
    base: 90,
    upliftFrom: "2026-03",
    upliftMultiplier: 1.4,
  }),
  // Customer 44 — brand new, flat.
  ...monthlyLedger({
    facilityId: 1,
    customerId: 44,
    start: "2026-04",
    end: "2026-05",
    base: 50,
  }),
  // Customer 58 — brand new, flat.
  ...monthlyLedger({
    facilityId: 1,
    customerId: 58,
    start: "2026-05",
    end: "2026-05",
    base: 60,
  }),
];

export function getSpendEventsByFacility(
  facilityId: number,
): LoyaltySpendEvent[] {
  return loyaltySpendEvents.filter((e) => e.facilityId === facilityId);
}

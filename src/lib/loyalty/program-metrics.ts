import type { CustomerLoyaltyAccount, RedemptionRecord } from "@/types/loyalty";

/**
 * Pure program-performance metrics for the Loyalty tab banner: revenue retained
 * through rewards this month, redemption rate this month, and member-vs-non-member
 * retention. No I/O; `now` is injected so it stays deterministic/testable.
 */

/** Assumed average order value used to dollar-estimate percentage discounts. */
const AVG_ORDER_VALUE = 75;
/** Nominal value credited for a free-service / freebie reward (string-valued). */
const FREE_SERVICE_VALUE = 45;
const RETENTION_WINDOW_DAYS = 60;
const DAY_MS = 86_400_000;

export interface BookingLite {
  clientId: number;
  startDate?: string;
  date?: string;
}

export interface ProgramPerformance {
  /** Estimated $ retained via loyalty rewards applied this month. */
  revenueRetained: number;
  /** Share (0–1) of members who redeemed at least once this month. */
  redemptionRate: number;
  membersRedeemed: number;
  totalMembers: number;
  /** Share (0–1) of loyalty members who re-booked within 60 days. */
  memberRetention: number;
  /** Same metric for non-members, for comparison. */
  nonMemberRetention: number;
}

/**
 * Dollar value of the savings a redemption gave the customer (the "discount
 * value applied") — covers both the engine's reward types and the legacy
 * marketing strings (credit_balance, discount_code, auto_apply, …).
 */
export function redemptionDollarValue(r: RedemptionRecord): number {
  const num =
    typeof r.rewardValue === "number"
      ? r.rewardValue
      : Number.parseFloat(String(r.rewardValue));
  const v = Number.isFinite(num) ? num : 0;
  switch (r.rewardType) {
    case "credit":
    case "credit_balance":
    case "gift_card":
    case "discount_fixed":
    case "discount_code":
      return v;
    case "discount_pct":
    case "discount":
      return Math.round(((AVG_ORDER_VALUE * v) / 100) * 100) / 100;
    case "free_service":
    case "auto_apply":
    case "freebie":
      return FREE_SERVICE_VALUE;
    default:
      return v;
  }
}

function isSameMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso);
  return d.getUTCFullYear() === year && d.getUTCMonth() === month;
}

/** Whether a customer re-booked within the retention window (≥2 bookings whose
 *  closest pair is ≤60 days apart). */
function rebookedWithinWindow(times: number[]): boolean {
  if (times.length < 2) return false;
  const sorted = [...times].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] <= RETENTION_WINDOW_DAYS * DAY_MS)
      return true;
  }
  return false;
}

export function computeProgramPerformance(input: {
  accounts: CustomerLoyaltyAccount[];
  redemptions: RedemptionRecord[];
  bookings: BookingLite[];
  now: string;
}): ProgramPerformance {
  const now = new Date(input.now);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  // --- Revenue retained + redemption rate (this month) ---------------------
  const monthRedemptions = input.redemptions.filter(
    (r) => r.redeemedAt && isSameMonth(r.redeemedAt, year, month),
  );
  const revenueRetained =
    Math.round(
      monthRedemptions.reduce((s, r) => s + redemptionDollarValue(r), 0) * 100,
    ) / 100;

  const totalMembers = input.accounts.length;
  const redeemedCustomerIds = new Set(
    monthRedemptions.map((r) => r.customerId),
  );
  const membersRedeemed = input.accounts.filter((a) =>
    redeemedCustomerIds.has(a.customerId),
  ).length;
  const redemptionRate = totalMembers > 0 ? membersRedeemed / totalMembers : 0;

  // --- Retention: members vs non-members -----------------------------------
  const memberIds = new Set(input.accounts.map((a) => a.customerId));
  const bookingsByCustomer = new Map<number, number[]>();
  for (const b of input.bookings) {
    const iso = b.startDate ?? b.date;
    if (!iso) continue;
    const ms = new Date(iso).getTime();
    if (!Number.isFinite(ms)) continue;
    const arr = bookingsByCustomer.get(b.clientId);
    if (arr) arr.push(ms);
    else bookingsByCustomer.set(b.clientId, [ms]);
  }

  const memberClientIds: number[] = [];
  const nonMemberClientIds: number[] = [];
  for (const clientId of bookingsByCustomer.keys()) {
    if (memberIds.has(clientId)) memberClientIds.push(clientId);
    else nonMemberClientIds.push(clientId);
  }

  const retainedShare = (ids: number[]): number => {
    if (ids.length === 0) return 0;
    const retained = ids.filter((id) =>
      rebookedWithinWindow(bookingsByCustomer.get(id) ?? []),
    ).length;
    return retained / ids.length;
  };

  return {
    revenueRetained,
    redemptionRate,
    membersRedeemed,
    totalMembers,
    memberRetention: retainedShare(memberClientIds),
    nonMemberRetention: retainedShare(nonMemberClientIds),
  };
}

// ─── Monthly points activity (earned vs redeemed) ────────────────────────────

export interface PointsActivityPoint {
  month: string;
  earned: number;
  redeemed: number;
  net: number;
}

/**
 * Real monthly points-earned-vs-redeemed series over the trailing `months`,
 * aggregated from members' points history (earned entries are positive;
 * redeemed entries are stored negative, so their magnitude is summed). Empty
 * months render as zero. `now` is injected for determinism.
 */
export function pointsActivityByMonth(
  history: { date: string; points: number; type: string }[],
  now: string,
  months = 12,
): PointsActivityPoint[] {
  const nowD = new Date(now);
  const order: string[] = [];
  const buckets = new Map<string, { earned: number; redeemed: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth() - i, 1),
    );
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    order.push(key);
    buckets.set(key, { earned: 0, redeemed: 0 });
  }
  for (const h of history) {
    const d = new Date(h.date);
    if (!Number.isFinite(d.getTime())) continue;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(key);
    if (!b) continue;
    if (h.type === "earned") b.earned += h.points;
    else if (h.type === "redeemed") b.redeemed += Math.abs(h.points);
  }
  return order.map((key) => {
    const b = buckets.get(key) ?? { earned: 0, redeemed: 0 };
    const label = new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
    });
    return {
      month: label,
      earned: b.earned,
      redeemed: b.redeemed,
      net: b.earned - b.redeemed,
    };
  });
}

// ─── The same three numbers, from the ledger instead of an assumption ────────
//
// Everything above this line is fixture-backed and estimates money. It survives
// only for `/marketing/loyalty-reports`, which has not been converted yet.
//
// ── WHAT WAS WRONG WITH ESTIMATING ────────────────────────────────────────
//
// `redemptionDollarValue` turns a 10% reward into dollars by multiplying it by
// AVG_ORDER_VALUE — a constant, 75, that nobody measured. FREE_SERVICE_VALUE is
// the same thing at 45. Those two numbers are then summed and shown to a
// facility owner as "Revenue retained", in dollars, with a currency sign, as if
// it were their money.
//
// It is not an estimate a business could act on: it is the same answer whatever
// their prices are, and it moves when somebody edits a constant in a TypeScript
// file. A number on an owner's dashboard has to come from what happened.
//
// ── WHAT HAPPENED IS RECORDED ─────────────────────────────────────────────
//
// A spent voucher carries `usedOnBookingRef`, so the bill it came off is
// knowable. That makes the actual saving computable rather than assumed:
//
//   discount_fixed   the amount, which is already dollars
//   discount_pct     the percentage OF THE BOOKING IT WAS SPENT ON
//
// ── AND WHAT IS NOT RECORDED IS NOT INVENTED ──────────────────────────────
//
// A `free_service` reward names no price anywhere — the voucher stores a
// service, not an amount — so its cash value cannot be sourced. It is COUNTED
// and reported separately as `unvaluedRewards` rather than folded in at a made
// up 45. The screen can then say "plus N rewards we cannot price", which is
// true, instead of a total that is confidently wrong.
//
// Same for a percentage voucher whose booking cannot be resolved: no bill, no
// number, counted as unvalued.

/** A voucher as `/api/loyalty/vouchers` returns it — only the fields used here. */
export interface LedgerVoucherLite {
  rewardType: string;
  rewardValue: number;
  effectiveStatus: string;
  usedAt: string | null;
  usedOnBookingRef: number | null;
  clientRef: number | null;
}

/** A booking as `/api/bookings` returns it — only the fields used here. */
export interface BookingMoneyLite {
  id: number;
  clientId: number;
  startDate?: string;
  date?: string;
  totalCost?: number;
}

export interface LedgerProgramPerformance extends ProgramPerformance {
  /**
   * Rewards spent this month whose cash value cannot be sourced.
   *
   * Reported so the screen can disclose the gap. Folding these in at an assumed
   * price is the bug this function exists to remove.
   */
  unvaluedRewards: number;
}

/**
 * The dollars a spent voucher actually took off a bill, or `null` when that
 * cannot be known. `null` is a real answer and must not be coerced to 0 — a
 * reward worth something unknown is not a reward worth nothing.
 */
export function voucherDollarValue(
  v: LedgerVoucherLite,
  bookingTotalByRef: Map<number, number>,
): number | null {
  if (!Number.isFinite(v.rewardValue)) return null;
  switch (v.rewardType) {
    case "discount_fixed":
      return v.rewardValue;
    case "discount_pct": {
      if (v.usedOnBookingRef === null) return null;
      const total = bookingTotalByRef.get(v.usedOnBookingRef);
      if (total === undefined) return null;
      return Math.round(total * v.rewardValue) / 100;
    }
    default:
      // free_service, and anything added later. No price is stored, so there is
      // nothing to read. Deliberately not a guess.
      return null;
  }
}

export function computeProgramPerformanceFromLedger(input: {
  accounts: { clientRef: number }[];
  vouchers: LedgerVoucherLite[];
  bookings: BookingMoneyLite[];
  now: string;
}): LedgerProgramPerformance {
  const now = new Date(input.now);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const bookingTotalByRef = new Map<number, number>();
  for (const b of input.bookings) {
    if (typeof b.totalCost === "number" && Number.isFinite(b.totalCost)) {
      bookingTotalByRef.set(b.id, b.totalCost);
    }
  }

  // SPENT this month. `effectiveStatus`, not `status`: nothing flips a row to
  // expired, so the stored column disagrees with reality on exactly the rows a
  // money figure must not get wrong.
  const spentThisMonth = input.vouchers.filter(
    (v) =>
      v.effectiveStatus === "used" &&
      v.usedAt !== null &&
      isSameMonth(v.usedAt, year, month),
  );

  let revenueRetained = 0;
  let unvaluedRewards = 0;
  for (const v of spentThisMonth) {
    const dollars = voucherDollarValue(v, bookingTotalByRef);
    if (dollars === null) unvaluedRewards += 1;
    else revenueRetained += dollars;
  }
  revenueRetained = Math.round(revenueRetained * 100) / 100;

  const totalMembers = input.accounts.length;
  const redeemedRefs = new Set(
    spentThisMonth
      .map((v) => v.clientRef)
      .filter((r): r is number => r !== null),
  );
  const membersRedeemed = input.accounts.filter((a) =>
    redeemedRefs.has(a.clientRef),
  ).length;

  // --- Retention: members vs non-members, from real bookings ---------------
  const memberRefs = new Set(input.accounts.map((a) => a.clientRef));
  const bookingsByClient = new Map<number, number[]>();
  for (const b of input.bookings) {
    const iso = b.startDate ?? b.date;
    if (!iso) continue;
    const ms = new Date(iso).getTime();
    if (!Number.isFinite(ms)) continue;
    const arr = bookingsByClient.get(b.clientId);
    if (arr) arr.push(ms);
    else bookingsByClient.set(b.clientId, [ms]);
  }

  const memberIds: number[] = [];
  const nonMemberIds: number[] = [];
  for (const clientId of bookingsByClient.keys()) {
    if (memberRefs.has(clientId)) memberIds.push(clientId);
    else nonMemberIds.push(clientId);
  }
  const retainedShare = (ids: number[]): number => {
    if (ids.length === 0) return 0;
    return (
      ids.filter((id) => rebookedWithinWindow(bookingsByClient.get(id) ?? []))
        .length / ids.length
    );
  };

  return {
    revenueRetained,
    redemptionRate: totalMembers > 0 ? membersRedeemed / totalMembers : 0,
    membersRedeemed,
    totalMembers,
    memberRetention: retainedShare(memberIds),
    nonMemberRetention: retainedShare(nonMemberIds),
    unvaluedRewards,
  };
}

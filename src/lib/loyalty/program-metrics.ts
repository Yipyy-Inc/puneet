import type {
  CustomerLoyaltyAccount,
  RedemptionRecord,
} from "@/types/loyalty";

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
    if (sorted[i] - sorted[i - 1] <= RETENTION_WINDOW_DAYS * DAY_MS) return true;
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
  const redeemedCustomerIds = new Set(monthRedemptions.map((r) => r.customerId));
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

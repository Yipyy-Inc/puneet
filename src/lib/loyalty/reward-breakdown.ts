import type { RedemptionRecord } from "@/types/loyalty";

/**
 * Pure reward-type breakdown for the Loyalty Reports "what are customers
 * redeeming?" report: redemptions bucketed by reward type and month (for a
 * stacked bar chart), plus average time from issuance to redemption per type
 * (for the responsiveness table). `now` is injected for determinism.
 */

export type CountBucket = "Credits" | "Discounts" | "Freebies" | "Gift cards";
export type RewardBucket = CountBucket | "Other";

export const REWARD_BUCKETS: CountBucket[] = [
  "Credits",
  "Discounts",
  "Freebies",
  "Gift cards",
];

export function rewardBucket(rewardType: string): RewardBucket {
  switch (rewardType) {
    case "credit":
    case "credit_balance":
      return "Credits";
    case "discount":
    case "discount_pct":
    case "discount_fixed":
    case "discount_code":
      return "Discounts";
    case "free_service":
    case "freebie":
    case "auto_apply":
      return "Freebies";
    case "gift_card":
      return "Gift cards";
    default:
      return "Other";
  }
}

export type RewardMonthRow = { month: string } & Record<CountBucket, number>;

/** Redemptions grouped by reward bucket per month (last `months`), by redeemedAt. */
export function rewardBreakdownByMonth(
  redemptions: RedemptionRecord[],
  now: string,
  months = 6,
): RewardMonthRow[] {
  const nowD = new Date(now);
  const rows: RewardMonthRow[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth() - i, 1));
    const year = m.getUTCFullYear();
    const month = m.getUTCMonth();
    const row: RewardMonthRow = {
      month: m.toLocaleDateString("en-US", { month: "short" }),
      Credits: 0,
      Discounts: 0,
      Freebies: 0,
      "Gift cards": 0,
    };
    for (const r of redemptions) {
      if (!r.redeemedAt) continue;
      const d = new Date(r.redeemedAt);
      if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month) continue;
      const b = rewardBucket(r.rewardType);
      if (b !== "Other") row[b] += 1;
    }
    rows.push(row);
  }
  return rows;
}

export interface TimeToRedeemRow {
  bucket: CountBucket;
  avgDays: number;
  count: number;
}

/**
 * Average days from issuance to redemption, per reward bucket. Only redeemed
 * vouchers that carry an issuedAt are counted.
 */
export function avgTimeToRedeemByType(
  redemptions: RedemptionRecord[],
): TimeToRedeemRow[] {
  const acc = new Map<CountBucket, { sum: number; n: number }>();
  for (const r of redemptions) {
    if (r.status !== "used" || !r.issuedAt || !r.redeemedAt) continue;
    const issued = new Date(r.issuedAt).getTime();
    const redeemed = new Date(r.redeemedAt).getTime();
    if (!Number.isFinite(issued) || !Number.isFinite(redeemed)) continue;
    if (redeemed < issued) continue;
    const b = rewardBucket(r.rewardType);
    if (b === "Other") continue;
    const days = (redeemed - issued) / 86_400_000;
    const cur = acc.get(b) ?? { sum: 0, n: 0 };
    cur.sum += days;
    cur.n += 1;
    acc.set(b, cur);
  }
  return REWARD_BUCKETS.filter((b) => acc.has(b)).map((b) => {
    const { sum, n } = acc.get(b)!;
    return { bucket: b, avgDays: Math.round(sum / n), count: n };
  });
}

import type {
  CustomerLoyaltyAccount,
  LoyaltyTransaction,
} from "@/types/loyalty";

/**
 * Pure points-liability metrics for the financial-planning report: the total
 * outstanding points balance (the "liability"), its dollar value, and a
 * 30/60/90-day redemption forecast based on the historical average daily
 * redemption rate. `now` is injected for determinism.
 */

const LOOKBACK_DAYS = 90;
const DAY_MS = 86_400_000;
const FORECAST_HORIZONS = [30, 60, 90];

export interface RedemptionForecast {
  days: number;
  /** Forecast points redeemed (capped at the outstanding balance). */
  points: number;
  /** Dollar value of that forecast at the redemption rate. */
  dollars: number;
}

export interface PointsLiability {
  totalPoints: number;
  dollarLiability: number;
  /** Avg points redeemed per day over the trailing 90 days. */
  avgDailyRedeemedPoints: number;
  forecast: RedemptionForecast[];
}

export function computePointsLiability(input: {
  accounts: CustomerLoyaltyAccount[];
  transactions: LoyaltyTransaction[];
  /** Points per $1 (default 100). */
  redemptionRate: number;
  now: string;
}): PointsLiability {
  const rate = input.redemptionRate > 0 ? input.redemptionRate : 100;

  const totalPoints = input.accounts.reduce((s, a) => s + a.pointsBalance, 0);
  const dollarLiability = Math.round((totalPoints / rate) * 100) / 100;

  const nowMs = new Date(input.now).getTime();
  const cutoff = nowMs - LOOKBACK_DAYS * DAY_MS;
  const redeemedPoints = input.transactions
    .filter((t) => t.transactionType === "redeemed")
    .filter((t) => {
      const ms = new Date(t.createdAt).getTime();
      return Number.isFinite(ms) && ms >= cutoff && ms <= nowMs;
    })
    .reduce((s, t) => s + Math.abs(t.points), 0);
  const avgDailyRedeemedPoints = redeemedPoints / LOOKBACK_DAYS;

  const forecast: RedemptionForecast[] = FORECAST_HORIZONS.map((days) => {
    const points = Math.min(
      totalPoints,
      Math.round(avgDailyRedeemedPoints * days),
    );
    return { days, points, dollars: Math.round((points / rate) * 100) / 100 };
  });

  return { totalPoints, dollarLiability, avgDailyRedeemedPoints, forecast };
}

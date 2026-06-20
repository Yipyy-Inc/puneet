import type { LoyaltyTransaction, RedemptionRecord } from "@/types/loyalty";
import { getLoyaltyAccount } from "@/data/loyalty-accounts";
import { loyaltyTransactions } from "@/data/loyalty-transactions";
import { redemptionRecords } from "@/data/loyalty-redemptions";

/**
 * Customer self-service points redemption: convert points into account credit at
 * the facility's redemption rate. Mutates the customer's loyalty account and
 * appends the history rows, mirroring addManualAdjustment. The default rate is
 * 100 points per $1.
 */

export const DEFAULT_REDEMPTION_RATE = 100;

export interface RedeemPointsResult {
  ok: boolean;
  error?: string;
  pointsRedeemed?: number;
  creditAdded?: number;
  pointsBalance?: number;
  creditBalance?: number;
}

let redeemSeq = 0;

export function redeemPointsForCredit(input: {
  facilityId: number;
  customerId: number;
  points: number;
  redemptionRate?: number;
}): RedeemPointsResult {
  const rate =
    input.redemptionRate && input.redemptionRate > 0
      ? input.redemptionRate
      : DEFAULT_REDEMPTION_RATE;

  const account = getLoyaltyAccount(input.facilityId, input.customerId);
  if (!account) return { ok: false, error: "No loyalty account found." };

  const points = Math.floor(input.points);
  if (!Number.isFinite(points) || points <= 0) {
    return { ok: false, error: "Enter how many points to redeem." };
  }
  // 1) Validate sufficient points.
  if (points > account.pointsBalance) {
    return { ok: false, error: "Not enough points for that redemption." };
  }

  const creditAdded = Math.round((points / rate) * 100) / 100;
  if (creditAdded <= 0) {
    return {
      ok: false,
      error: `Redeem at least ${rate} points for $1 credit.`,
    };
  }

  const now = new Date().toISOString();
  redeemSeq += 1;

  // 2) Deduct points. 3) Add credit.
  account.pointsBalance -= points;
  account.lifetimePointsRedeemed += points;
  account.creditBalance += creditAdded;
  account.updatedAt = now;

  // 4) PointTransaction of type=redemption (existing "redeemed" type).
  const txn: LoyaltyTransaction = {
    id: `redeem-${input.facilityId}-${input.customerId}-${Date.now()}-${redeemSeq}`,
    customerId: input.customerId,
    facilityId: input.facilityId,
    transactionType: "redeemed",
    points: -points,
    value: creditAdded,
    description: `Redeemed ${points} points for $${creditAdded.toFixed(2)} credit`,
    source: "manual",
    createdAt: now,
  };
  loyaltyTransactions.push(txn);

  // 5) RewardRedemption of type=credit (portal self-service).
  const redemption: RedemptionRecord = {
    id: `rdm-credit-${input.facilityId}-${input.customerId}-${Date.now()}-${redeemSeq}`,
    facilityId: input.facilityId,
    customerId: input.customerId,
    rewardType: "credit",
    rewardValue: creditAdded,
    redeemMethod: "portal_self",
    bookingId: null,
    invoiceId: null,
    issuedAt: now,
    redeemedAt: now,
    expiresAt: null,
    status: "used",
  };
  redemptionRecords.push(redemption);

  return {
    ok: true,
    pointsRedeemed: points,
    creditAdded,
    pointsBalance: account.pointsBalance,
    creditBalance: account.creditBalance,
  };
}

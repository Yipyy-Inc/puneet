import type {
  CustomerLoyaltyAccount,
  LoyaltyTransaction,
} from "@/types/loyalty";

/** Customers get an email this many days before their points expire. */
export const EXPIRY_WARNING_DAYS = 30;

function daysBetween(laterISO: string, earlierISO: string): number {
  const later = new Date(laterISO).getTime();
  const earlier = new Date(earlierISO).getTime();
  return Math.floor((later - earlier) / (1000 * 60 * 60 * 24));
}

export interface ExpiryWarning {
  account: CustomerLoyaltyAccount;
  daysUntilExpiry: number;
}

export interface ExpiryRunResult {
  /** Accounts after the run (expired ones zeroed out); others unchanged. */
  updatedAccounts: CustomerLoyaltyAccount[];
  /** One "expired" transaction per account whose points lapsed. */
  expiredTransactions: LoyaltyTransaction[];
  /** Accounts entering the 30-day warning window (caller emails them). */
  warnings: ExpiryWarning[];
}

export interface PointsExpirySettings {
  enabled?: boolean;
  expiryDays?: number;
}

/**
 * Pure "nightly cron" logic for inactivity-based points expiry. For each
 * account inactive beyond `expiryDays`, zero its points and emit an "expired"
 * transaction; accounts within `EXPIRY_WARNING_DAYS` of expiring are flagged for
 * a warning email. Never mutates inputs; a `now` timestamp is passed in so the
 * function stays deterministic/testable.
 */
export function runPointsExpiry(
  accounts: CustomerLoyaltyAccount[],
  settings: PointsExpirySettings,
  now: string,
): ExpiryRunResult {
  const result: ExpiryRunResult = {
    updatedAccounts: [],
    expiredTransactions: [],
    warnings: [],
  };

  const { enabled, expiryDays } = settings;
  if (!enabled || !expiryDays || expiryDays <= 0) {
    result.updatedAccounts = accounts;
    return result;
  }

  for (const account of accounts) {
    const lastActivity = account.lastActivityAt ?? account.updatedAt;
    const inactiveDays = daysBetween(now, lastActivity);

    if (account.pointsBalance > 0 && inactiveDays >= expiryDays) {
      result.expiredTransactions.push({
        id: `txn-expiry-${account.facilityId}-${account.customerId}`,
        customerId: account.customerId,
        facilityId: account.facilityId,
        transactionType: "expired",
        points: -account.pointsBalance,
        description: `Points expired after ${expiryDays} days of inactivity`,
        source: "manual",
        createdAt: now,
      });
      result.updatedAccounts.push({
        ...account,
        pointsBalance: 0,
        updatedAt: now,
      });
      continue;
    }

    if (
      account.pointsBalance > 0 &&
      inactiveDays >= expiryDays - EXPIRY_WARNING_DAYS &&
      inactiveDays < expiryDays
    ) {
      result.warnings.push({
        account,
        daysUntilExpiry: expiryDays - inactiveDays,
      });
    }
    result.updatedAccounts.push(account);
  }

  return result;
}

/** Lightweight counts for the settings preview (how many accounts a run would
 *  affect today), without producing the full result. */
export function summarizeExpiry(
  accounts: CustomerLoyaltyAccount[],
  enabled: boolean,
  expiryDays: number,
  now: string,
): { wouldExpire: number; inWarningWindow: number } {
  const run = runPointsExpiry(accounts, { enabled, expiryDays }, now);
  return {
    wouldExpire: run.expiredTransactions.length,
    inWarningWindow: run.warnings.length,
  };
}

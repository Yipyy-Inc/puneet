import type {
  CustomerLoyaltyAccount,
  FacilityLoyaltyConfig,
} from "@/types/loyalty";
import { loyaltyAccounts, getLoyaltyAccount } from "@/data/loyalty-accounts";
import { loyaltyTransactions } from "@/data/loyalty-transactions";
import {
  processLoyaltyEvent,
  createLoyaltyAccount,
  type EngineResult,
  type LoyaltyEvent,
  type LoyaltyEventInput,
} from "@/lib/loyalty/engine";

export type {
  LoyaltyEvent,
  LoyaltyEventInput,
  EngineResult,
} from "@/lib/loyalty/engine";

/**
 * Commit layer for the loyalty automation engine: bridges the pure engine
 * (src/lib/loyalty/engine.ts) to the mock data arrays. This is the entrypoint
 * the rest of the app calls when a customer event happens — it lazily creates
 * the customer's loyalty account, runs the engine, and persists the result.
 *
 * The engine itself stays pure; all mutation lives here, mirroring the
 * addManualAdjustment pattern in loyalty-transactions.ts.
 */

/** Get the customer's loyalty account, creating a zeroed one on first contact
 *  (accounts are created lazily when a customer first transacts at a facility
 *  whose program is enabled). */
export function getOrCreateLoyaltyAccount(
  facilityId: number,
  customerId: number,
  now: string,
): CustomerLoyaltyAccount {
  const existing = getLoyaltyAccount(facilityId, customerId);
  if (existing) return existing;
  const created = createLoyaltyAccount(facilityId, customerId, now);
  loyaltyAccounts.push(created);
  return created;
}

/**
 * Process a customer event end-to-end: run the engine and persist the new
 * account state + transactions. Returns the full EngineResult (tier change,
 * unlocked badges, applied discount, notifications) for callers to surface.
 *
 * No-op (and no account is created) when the facility's program is disabled.
 */
export function recordLoyaltyEvent(
  event: LoyaltyEventInput,
  config: FacilityLoyaltyConfig,
): EngineResult {
  const now = new Date().toISOString();
  const fullEvent: LoyaltyEvent = {
    ...event,
    occurredAt: event.occurredAt ?? now,
  };

  if (!config.enabled) {
    const account =
      getLoyaltyAccount(fullEvent.facilityId, fullEvent.customerId) ??
      createLoyaltyAccount(fullEvent.facilityId, fullEvent.customerId, now);
    return { account, transactions: [], unlockedBadges: [], notifications: [] };
  }

  const account = getOrCreateLoyaltyAccount(
    fullEvent.facilityId,
    fullEvent.customerId,
    now,
  );
  const result = processLoyaltyEvent(fullEvent, { config, account, now });

  // Commit in place so existing holders of the array element see the update,
  // then append the new history rows.
  Object.assign(account, result.account);
  loyaltyTransactions.push(...result.transactions);

  return result;
}

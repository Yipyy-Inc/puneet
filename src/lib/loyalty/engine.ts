import type {
  Badge,
  BadgeRewardType,
  CustomerLoyaltyAccount,
  FacilityLoyaltyConfig,
  LoyaltyTransaction,
  LoyaltyTransactionSource,
  LoyaltyTransactionType,
  Tier,
} from "@/types/loyalty";
import { getActiveEarnRules } from "./earn-rule-versioning";
import { computeEarnings, type EarnOutcome } from "./engine-earn";
import {
  discountAmount,
  resolveTier,
  tierDiscount,
  tierEarnMultiplier,
} from "./engine-tier";
import { evaluateBadges } from "./engine-badges";

/**
 * Loyalty automation engine — the core of the loyalty module.
 *
 * A single pure, deterministic function turns one customer event into all of the
 * automated loyalty actions: earning points/credit, applying the member's tier
 * discount, upgrading their tier, and firing achievement-badge rewards. No staff
 * intervention, no I/O, no shared mutable state.
 *
 * Multi-tenant safety ("5,000+ facilities simultaneously with zero collisions"):
 * every call operates only on the one `(facilityId, customerId)` passed in, and
 * all generated ids are namespaced by `facilityId + customerId + eventId` with no
 * `Date.now()`/`Math.random()`. So concurrent facilities can never produce a
 * colliding id or read/write each other's state, and re-processing the same event
 * yields byte-identical ids (safe to retry). The clock is injected as `now`.
 */

export type LoyaltyEventType =
  | "booking_completed"
  | "purchase"
  | "referral_completed"
  | "review_submitted"
  | "birthday"
  | "app_download"
  | "manual_award";

export interface LoyaltyEvent {
  type: LoyaltyEventType;
  /** Unique id of the originating record (booking id, invoice id, …). Drives
   *  deterministic transaction ids and idempotent retries. */
  id: string;
  facilityId: number;
  customerId: number;
  /** When the event occurred (ISO). Used for schedule windows. */
  occurredAt: string;
  /** Money spent (booking_completed / purchase). */
  amount?: number;
  /** Service type id (booking_completed) — used by service_type rules + scope. */
  serviceType?: string;
  /** Service (vs retail) transaction — drives points scope. Defaults to true. */
  isService?: boolean;
  /** True when this completed booking is the customer's first ever. */
  isFirstBooking?: boolean;
  /** Explicit staff award (manual_award): points (+add / −remove). */
  manualPoints?: number;
  staffId?: string;
  staffName?: string;
  reason?: string;
}

/** A loyalty event whose `occurredAt` may be omitted — the commit layer
 *  defaults it to the processing time. Convenient for UI callers. */
export type LoyaltyEventInput = Omit<LoyaltyEvent, "occurredAt"> & {
  occurredAt?: string;
};

export interface TierChange {
  from: string | null;
  to: string | null;
  direction: "upgrade" | "downgrade";
}

export interface UnlockedBadgeResult {
  badge: Badge;
  reward?: { type: BadgeRewardType; points: number; credit: number };
}

export interface AppliedDiscount {
  type: "discount_pct" | "discount_fixed";
  value: number;
  /** Dollars saved on this transaction. */
  amount: number;
}

export interface LoyaltyNotification {
  type: "tier_upgrade" | "badge_unlocked";
  title: string;
  body: string;
  facilityId: number;
  customerId: number;
}

export interface EngineResult {
  /** New, immutable account state (the input account is never mutated). */
  account: CustomerLoyaltyAccount;
  /** Every points/credit movement this event produced, earnRuleId-stamped. */
  transactions: LoyaltyTransaction[];
  tierChange?: TierChange;
  unlockedBadges: UnlockedBadgeResult[];
  /** Tier discount the member's tier auto-applied to this transaction, if any. */
  discountApplied?: AppliedDiscount;
  /** In-app notifications to surface (tier upgrades, badge unlocks). */
  notifications: LoyaltyNotification[];
}

export interface EngineContext {
  config: FacilityLoyaltyConfig;
  account: CustomerLoyaltyAccount;
  /** Injected clock (ISO) — keeps the engine deterministic and testable. */
  now: string;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function asNumber(value: number | string): number {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** Deterministic, collision-free referral code from the id pair. */
export function makeReferralCode(facilityId: number, customerId: number): string {
  const seed = (facilityId * 100003 + customerId).toString(36).toUpperCase();
  return `REF-${seed.padStart(5, "0")}`;
}

/** A fresh zeroed account — created lazily when a customer first transacts at a
 *  facility whose loyalty program is enabled. */
export function createLoyaltyAccount(
  facilityId: number,
  customerId: number,
  now: string,
): CustomerLoyaltyAccount {
  return {
    id: `acct-${facilityId}-${customerId}`,
    facilityId,
    customerId,
    pointsBalance: 0,
    lifetimePointsEarned: 0,
    lifetimePointsRedeemed: 0,
    creditBalance: 0,
    currentTierId: null,
    tierJoinedAt: null,
    totalSpend: 0,
    totalVisits: 0,
    referralCode: makeReferralCode(facilityId, customerId),
    referralCount: 0,
    reviewCount: 0,
    earnedBadgeIds: [],
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function sourceForEvent(type: LoyaltyEventType): LoyaltyTransactionSource {
  switch (type) {
    case "booking_completed":
      return "booking";
    case "purchase":
      return "pos";
    case "referral_completed":
      return "referral";
    default:
      return "manual";
  }
}

function tierById(tiers: Tier[], id: string | null): Tier | null {
  if (!id) return null;
  return tiers.find((t) => t.id === id) ?? null;
}

// ----------------------------------------------------------------------------
// Engine
// ----------------------------------------------------------------------------

/**
 * Run the automation engine for one event. Returns a new account plus every
 * transaction, tier change, unlocked badge, applied discount, and notification
 * the event produced. Pure: the input account/config are never mutated.
 */
export function processLoyaltyEvent(
  event: LoyaltyEvent,
  { config, account, now }: EngineContext,
): EngineResult {
  // Disabled program → no-op (still nothing leaks across facilities).
  if (!config.enabled) {
    return { account, transactions: [], unlockedBadges: [], notifications: [] };
  }

  const tiers = config.tiersEnabled === false ? [] : (config.tierDefinitions ?? []);
  const preTier = resolveTier(tiers, account);
  const multiplier = tierEarnMultiplier(preTier);

  const acc: CustomerLoyaltyAccount = { ...account };
  const transactions: LoyaltyTransaction[] = [];
  const notifications: LoyaltyNotification[] = [];
  let seq = 0;
  const nextTxnId = () =>
    `lt-${event.facilityId}-${event.customerId}-${event.type}-${event.id}-${seq++}`;

  const baseTxn = (
    type: LoyaltyTransactionType,
    points: number,
    description: string,
    extra: Partial<LoyaltyTransaction> = {},
  ): LoyaltyTransaction => ({
    id: nextTxnId(),
    customerId: event.customerId,
    facilityId: event.facilityId,
    transactionType: type,
    points,
    description,
    source: sourceForEvent(event.type),
    createdAt: now,
    ...(event.type === "booking_completed" ? { bookingId: event.id } : {}),
    ...(event.type === "purchase" ? { invoiceId: event.id } : {}),
    ...extra,
  });

  // --- Earning -------------------------------------------------------------
  const explicitManual =
    event.type === "manual_award" && event.manualPoints !== undefined;

  if (explicitManual) {
    const pts = event.manualPoints ?? 0;
    if (pts !== 0) {
      acc.pointsBalance = Math.max(0, acc.pointsBalance + pts);
      if (pts > 0) acc.lifetimePointsEarned += pts;
      transactions.push(
        baseTxn(
          "manual_adjustment",
          pts,
          `Staff adjustment: ${event.reason ?? "manual award"}`,
          {
            staffId: event.staffId,
            staffName: event.staffName,
            reason: event.reason,
          },
        ),
      );
    }
  } else {
    const activeRules = getActiveEarnRules(config.earnRules ?? []);
    const visitNumber = acc.totalVisits + 1;
    const outcomes: EarnOutcome[] = computeEarnings(activeRules, event, config, {
      tierMultiplier: multiplier,
      visitNumber,
    });

    for (const o of outcomes) {
      const txnType: LoyaltyTransactionType =
        o.rule.triggerType === "referral_completed" ? "referral" : "earned";
      if (o.points > 0) {
        acc.pointsBalance += o.points;
        acc.lifetimePointsEarned += o.points;
      }
      if (o.credit > 0) {
        acc.creditBalance += o.credit;
      }
      transactions.push(
        baseTxn(txnType, o.points, o.description, {
          earnRuleId: o.rule.id,
          ...(o.credit > 0 ? { value: o.credit } : {}),
        }),
      );
    }
  }

  // --- Counters (spend / visits / referrals / reviews) ---------------------
  if (
    (event.type === "booking_completed" || event.type === "purchase") &&
    event.amount
  ) {
    acc.totalSpend += event.amount;
  }
  if (event.type === "booking_completed") acc.totalVisits += 1;
  if (event.type === "referral_completed") acc.referralCount += 1;
  if (event.type === "review_submitted") {
    acc.reviewCount = (acc.reviewCount ?? 0) + 1;
  }
  acc.lastActivityAt = now;
  acc.updatedAt = now;

  // --- Tier recompute (upgrades) -------------------------------------------
  let tierChange: TierChange | undefined;
  if (tiers.length > 0) {
    const postTier = resolveTier(tiers, acc);
    const newTierId = postTier?.id ?? null;
    if (newTierId !== account.currentTierId) {
      const oldSort = tierById(tiers, account.currentTierId)?.sortOrder ?? -1;
      const newSort = postTier?.sortOrder ?? -1;
      const direction = newSort >= oldSort ? "upgrade" : "downgrade";
      acc.currentTierId = newTierId;
      acc.tierJoinedAt = now;
      tierChange = { from: account.currentTierId, to: newTierId, direction };
      if (direction === "upgrade" && postTier) {
        notifications.push({
          type: "tier_upgrade",
          title: `You've reached ${postTier.name}! ${postTier.icon}`,
          body: `Enjoy your new ${postTier.name} member benefits.`,
          facilityId: event.facilityId,
          customerId: event.customerId,
        });
      }
    }
  }

  // --- Badges --------------------------------------------------------------
  const currentTier = tiers.length > 0 ? resolveTier(tiers, acc) : null;
  const { newlyUnlocked, earnedBadgeIds } = evaluateBadges(
    config.badges ?? [],
    {
      bookingsCount: acc.totalVisits,
      totalSpent: acc.totalSpend,
      referrals: acc.referralCount,
      reviews: acc.reviewCount ?? 0,
      currentTier,
    },
    tiers,
    acc.earnedBadgeIds ?? [],
  );
  acc.earnedBadgeIds = earnedBadgeIds;

  const unlockedBadges: UnlockedBadgeResult[] = newlyUnlocked.map((badge) => {
    let points = 0;
    let credit = 0;
    if (badge.reward) {
      const val = asNumber(badge.reward.value);
      if (badge.reward.type === "points") {
        points = val;
        acc.pointsBalance += val;
        acc.lifetimePointsEarned += val;
      } else if (badge.reward.type === "credit") {
        credit = val;
        acc.creditBalance += val;
      }
      transactions.push(
        baseTxn("earned", points, `Badge unlocked: ${badge.name}`, {
          ...(credit > 0 ? { value: credit } : {}),
        }),
      );
    }
    notifications.push({
      type: "badge_unlocked",
      title: `Badge unlocked: ${badge.name} ${badge.icon}`,
      body: badge.description,
      facilityId: event.facilityId,
      customerId: event.customerId,
    });
    return badge.reward
      ? { badge, reward: { type: badge.reward.type, points, credit } }
      : { badge };
  });

  // --- Tier discount applied to this transaction ---------------------------
  let discountApplied: AppliedDiscount | undefined;
  if (
    (event.type === "booking_completed" || event.type === "purchase") &&
    event.amount &&
    preTier
  ) {
    const d = tierDiscount(preTier, event.serviceType);
    if (d) {
      discountApplied = {
        type: d.type,
        value: d.value,
        amount: discountAmount(d, event.amount),
      };
    }
  }

  return {
    account: acc,
    transactions,
    tierChange,
    unlockedBadges,
    discountApplied,
    notifications,
  };
}

/**
 * Run the engine over many `(event, config, account)` triples — e.g. a nightly
 * sweep across every facility. Each item is fully isolated and its ids are
 * namespaced per facility+customer, so processing all 5,000+ facilities in one
 * batch is collision-free regardless of order or concurrency.
 */
export function processLoyaltyEventBatch(
  items: { event: LoyaltyEvent; config: FacilityLoyaltyConfig; account: CustomerLoyaltyAccount }[],
  now: string,
): EngineResult[] {
  return items.map((it) =>
    processLoyaltyEvent(it.event, {
      config: it.config,
      account: it.account,
      now,
    }),
  );
}

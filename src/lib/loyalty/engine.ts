import type {
  Badge,
  BadgeRewardType,
  CustomerBadge,
  CustomerLoyaltyAccount,
  FacilityLoyaltyConfig,
  LoyaltyTransaction,
  LoyaltyTransactionSource,
  LoyaltyTransactionType,
  RedemptionRecord,
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
import { tierBenefitList } from "./tier-notification";
import { badgeEarnedPortalBody, badgeEarnedTitle } from "./badge-notification";

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
  type:
    | "tier_upgrade"
    | "badge_unlocked"
    | "points_earned"
    | "program_welcome"
    | "referral_reward_applied";
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
  /** Reward vouchers earned this event (discount / freebie / gift-card rewards
   *  from earn rules or badges) — active, expiring in 30 days, redeemable later. */
  redemptions: RedemptionRecord[];
  tierChange?: TierChange;
  unlockedBadges: UnlockedBadgeResult[];
  /** CustomerBadge records to persist for badges earned this event (one per
   *  customer/facility/badge, created once). */
  customerBadges: CustomerBadge[];
  /** Tier discount the member's tier auto-applied to this transaction, if any. */
  discountApplied?: AppliedDiscount;
  /** In-app notifications to surface (tier upgrades, badge unlocks, points). */
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
export function makeReferralCode(
  facilityId: number,
  customerId: number,
): string {
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

/** Discount/freebie/gift-card reward vouchers stay redeemable for 30 days. */
const REWARD_VOUCHER_EXPIRY_DAYS = 30;

function addDays(nowIso: string, days: number): string {
  const t = new Date(nowIso).getTime();
  return new Date(t + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Build a reward voucher (RewardRedemption) for a non-balance reward earned from
 * a rule or badge — active immediately, expiring in 30 days. Id is namespaced
 * per facility+customer+event for cross-facility collision safety.
 */
function buildRedemption(
  event: LoyaltyEvent,
  rewardType: string,
  rewardValue: number | string,
  now: string,
  seq: number,
  appliesToServiceTypes: string[] | null = null,
): RedemptionRecord {
  return {
    id: `lr-${event.facilityId}-${event.customerId}-${event.type}-${event.id}-${seq}`,
    facilityId: event.facilityId,
    customerId: event.customerId,
    rewardType,
    rewardValue,
    redeemMethod: "auto_applied",
    bookingId: event.type === "booking_completed" ? event.id : null,
    invoiceId: event.type === "purchase" ? event.id : null,
    issuedAt: now,
    redeemedAt: now,
    expiresAt: addDays(now, REWARD_VOUCHER_EXPIRY_DAYS),
    status: "active",
    appliesToServiceTypes,
  };
}

type TierUpReward = NonNullable<Tier["tierUpReward"]>;

function describeTierUpReward(reward: TierUpReward): string {
  if (reward.type === "credit") {
    return `You've earned $${reward.value} in account credit.`;
  }
  if (reward.type === "discount_pct") {
    return `You've unlocked ${reward.value}% off your next visit.`;
  }
  return `You've unlocked $${reward.value} off your next visit.`;
}

/** The one-time reach-tier reward voucher. Id is keyed by the tier reached so a
 *  customer earns each tier's welcome reward exactly once. */
function buildTierUpRedemption(
  account: CustomerLoyaltyAccount,
  tier: Tier,
  reward: TierUpReward,
  now: string,
): RedemptionRecord {
  return {
    id: `lt-tierup-${account.facilityId}-${account.customerId}-${tier.id}`,
    facilityId: account.facilityId,
    customerId: account.customerId,
    rewardType: reward.type,
    rewardValue: reward.value,
    redeemMethod: "auto_applied",
    bookingId: null,
    invoiceId: null,
    issuedAt: now,
    redeemedAt: now,
    expiresAt: addDays(now, REWARD_VOUCHER_EXPIRY_DAYS),
    status: "active",
  };
}

export interface TierRecalcResult {
  /** The tier id the account should hold after recalculation (may be unchanged). */
  currentTierId: string | null;
  tierJoinedAt: string | null;
  tierChange?: TierChange;
  /** Tier-up reward voucher, when the newly-reached tier grants one. */
  redemption?: RedemptionRecord;
  notification?: LoyaltyNotification;
}

/**
 * Tier recalculation (the spec's `tierRecalculate`). Finds the highest tier the
 * account now qualifies for; upgrades fire immediately (stamping tierJoinedAt,
 * issuing the tier's one-time reward as a RewardRedemption, and producing a
 * "You've reached X" notification). Downgrades are suppressed unless the facility
 * has explicitly enabled `tierDowngradeEnabled` — a customer keeps the tier they
 * earned even if thresholds later change. Pure: never mutates its inputs.
 */
export function recalculateTier(
  account: CustomerLoyaltyAccount,
  config: FacilityLoyaltyConfig,
  now: string,
): TierRecalcResult {
  const unchanged: TierRecalcResult = {
    currentTierId: account.currentTierId,
    tierJoinedAt: account.tierJoinedAt,
  };

  const tiers =
    config.tiersEnabled === false ? [] : (config.tierDefinitions ?? []);
  if (tiers.length === 0) return unchanged;

  const target = resolveTier(tiers, account);
  const targetId = target?.id ?? null;
  if (targetId === account.currentTierId) return unchanged;

  const oldSort = tierById(tiers, account.currentTierId)?.sortOrder ?? -1;
  const newSort = target?.sortOrder ?? -1;
  const isUpgrade = newSort > oldSort;

  // Never downgrade unless the facility explicitly enabled it.
  if (!isUpgrade && config.tierDowngradeEnabled !== true) return unchanged;

  const result: TierRecalcResult = {
    currentTierId: targetId,
    tierJoinedAt: now,
    tierChange: {
      from: account.currentTierId,
      to: targetId,
      direction: isUpgrade ? "upgrade" : "downgrade",
    },
  };

  if (isUpgrade && target) {
    let rewardDetail = "";
    if (target.tierUpReward) {
      result.redemption = buildTierUpRedemption(
        account,
        target,
        target.tierUpReward,
        now,
      );
      rewardDetail = ` ${describeTierUpReward(target.tierUpReward)}`;
    }
    const benefits = tierBenefitList(target);
    const unlocked = benefits.length
      ? ` Here's what you've unlocked: ${benefits.join(", ")}.`
      : ` Enjoy your new ${target.name} member benefits.`;
    result.notification = {
      type: "tier_upgrade",
      title: `Congratulations — you've reached ${target.name}! ${target.icon}`,
      body: `${unlocked.trimStart()}${rewardDetail}`,
      facilityId: account.facilityId,
      customerId: account.customerId,
    };
  }

  return result;
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
    return {
      account,
      transactions: [],
      redemptions: [],
      unlockedBadges: [],
      customerBadges: [],
      notifications: [],
    };
  }

  const tiers =
    config.tiersEnabled === false ? [] : (config.tierDefinitions ?? []);
  const preTier = resolveTier(tiers, account);
  const multiplier = tierEarnMultiplier(preTier);

  const acc: CustomerLoyaltyAccount = { ...account };
  const transactions: LoyaltyTransaction[] = [];
  const redemptions: RedemptionRecord[] = [];
  const notifications: LoyaltyNotification[] = [];
  let seq = 0;
  let redSeq = 0;
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
    const outcomes: EarnOutcome[] = computeEarnings(
      activeRules,
      event,
      config,
      {
        tierMultiplier: multiplier,
        visitNumber,
      },
    );

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
      // Non-balance reward (discount / freebie / gift card) → redeemable voucher,
      // carrying the rule's service scope so checkout can apply it selectively.
      if (o.perk) {
        redemptions.push(
          buildRedemption(
            event,
            o.perk.type,
            o.perk.value,
            now,
            redSeq++,
            o.rule.appliesToServiceTypes,
          ),
        );
      }
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

  // --- Tier recalculation (upgrades now; downgrades only if enabled) -------
  const tierResult = recalculateTier(acc, config, now);
  acc.currentTierId = tierResult.currentTierId;
  acc.tierJoinedAt = tierResult.tierJoinedAt;
  const tierChange = tierResult.tierChange;
  if (tierResult.redemption) redemptions.push(tierResult.redemption);
  if (tierResult.notification) notifications.push(tierResult.notification);

  // --- Badges --------------------------------------------------------------
  // Use the tier the customer is actually credited with (post-recalc), so
  // reached_tier badges respect a retained tier when downgrades are suppressed.
  const currentTier =
    tiers.length > 0 ? tierById(tiers, acc.currentTierId) : null;
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

  const customerBadges: CustomerBadge[] = [];
  const unlockedBadges: UnlockedBadgeResult[] = newlyUnlocked.map((badge) => {
    customerBadges.push({
      id: `cb-${event.facilityId}-${event.customerId}-${badge.id}`,
      facilityId: event.facilityId,
      customerId: event.customerId,
      badgeId: badge.id,
      earnedAt: now,
    });
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
      // Badge granting a discount / freebie / gift card → redeemable voucher.
      if (badge.reward.type !== "points" && badge.reward.type !== "credit") {
        redemptions.push(
          buildRedemption(
            event,
            badge.reward.type,
            badge.reward.value,
            now,
            redSeq++,
          ),
        );
      }
    }
    notifications.push({
      type: "badge_unlocked",
      title: badgeEarnedTitle(badge),
      body: badgeEarnedPortalBody(badge),
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

  // --- Customer notification: points / credit earned (step 7) --------------
  // Summarize what the customer earned this event (excludes staff manual
  // adjustments). Tier-upgrade / badge-unlock notifications are added above.
  const celebratory = transactions.filter(
    (t) => t.transactionType === "earned" || t.transactionType === "referral",
  );
  const earnedPoints = celebratory
    .filter((t) => t.points > 0)
    .reduce((s, t) => s + t.points, 0);
  const earnedCredit = celebratory
    .filter((t) => t.points === 0 && (t.value ?? 0) > 0)
    .reduce((s, t) => s + (t.value ?? 0), 0);
  if (earnedPoints > 0 || earnedCredit > 0) {
    // Portal + push only — per spec, routine point earns never trigger email
    // (email is reserved for tier changes, badge awards, reward availability).
    const bits: string[] = [];
    if (earnedPoints > 0) bits.push(`${earnedPoints} points`);
    if (earnedCredit > 0) bits.push(`$${earnedCredit} credit`);

    // "for your [service] booking" when this earn came from a completed booking.
    const service =
      event.serviceType && event.serviceType.trim()
        ? event.serviceType.trim()
        : null;
    const forClause =
      event.type === "booking_completed"
        ? service
          ? ` for your ${service} booking`
          : " for your booking"
        : "";

    // Dollar value of the new balance at the redemption rate (points per $1).
    const rate =
      config.redemptionRate && config.redemptionRate > 0
        ? config.redemptionRate
        : 100;
    const dollarValue = (acc.pointsBalance / rate).toFixed(2);

    const balanceClause =
      earnedPoints > 0
        ? ` Your new balance is ${acc.pointsBalance.toLocaleString()} points (= $${dollarValue} value).`
        : " Thanks for visiting — your rewards balance has been updated.";

    notifications.unshift({
      type: "points_earned",
      title: `You earned ${bits.join(" + ")}! 🐾`,
      body: `You earned ${bits.join(" + ")}${forClause}.${balanceClause}`,
      facilityId: event.facilityId,
      customerId: event.customerId,
    });
  }

  return {
    account: acc,
    transactions,
    redemptions,
    tierChange,
    unlockedBadges,
    customerBadges,
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
  items: {
    event: LoyaltyEvent;
    config: FacilityLoyaltyConfig;
    account: CustomerLoyaltyAccount;
  }[],
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

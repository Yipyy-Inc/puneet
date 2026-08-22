import { badgeRewardText } from "@/lib/loyalty/badge-summary";
import { evaluateBadges, type BadgeStats } from "@/lib/loyalty/engine-badges";
import type { createServerClient } from "@/lib/supabase/server";
import type { Badge, FacilityLoyaltyConfig, Tier } from "@/types/loyalty";
import { readTierFacts, type TierFacts } from "@/lib/api/loyalty-tier";

// ============================================================================
// A badge is awarded by the server, from facts the server can see.
//
// ── WHAT WAS MISSING ──────────────────────────────────────────────────────
//
// The badge DEFINITIONS were already real — a facility writes them in the
// Badges wizard and they live in `facility_settings.loyalty_config`. Nothing
// awarded one. `src/data/loyalty-badges.ts` held eleven hand-authored rows for
// `facilityId: 1`, and the only code that ever created another pushed onto an
// in-memory array inside the fixture engine that no server has ever run.
//
// So a customer completed their fiftieth booking against a "Complete 10
// bookings" badge and earned nothing, while their portal showed them somebody
// else's eleven.
//
// ── THE CRITERIA ARE NOT RESTATED HERE ────────────────────────────────────
//
// `badgeCriteriaMet` and `evaluateBadges` already decide it, and they are
// tested. What this module supplies is the FACTS — real visits, real spend,
// the tier the account actually holds — and the writing. The same division
// tier resolution uses: the pure function decides, the database records.
//
// ── FOUR OF THE SEVEN CONDITIONS CAN FIRE, AND THAT IS HONEST ─────────────
//
// `bookings_count`, `total_spent`, `first_booking` and `reached_tier` are
// measurable from rows this database holds. The other three are not:
//
//   - `referrals` — no referral is recorded against an account anywhere.
//     `loyalty_accounts.referral_code` exists, with a unique index, and is
//     never populated.
//   - `reviews` — there is no reviews table.
//   - `consecutive_months` — `badgeCriteriaMet` already returns false for it,
//     and has always said why.
//
// They are reported as zero rather than estimated, so a badge that needs them
// simply does not unlock. A guess here would award a real reward — points,
// credit, a discount off a real bill — for something nobody can show happened.
// ============================================================================

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

/** What the badge criteria are measured against. */
export function badgeStatsFor(facts: TierFacts, tier: Tier | null): BadgeStats {
  return {
    // A "booking" for badge purposes is a PAID visit — the same count
    // `loyalty_account_overview` derives and the earn rules already use for
    // visit milestones. Counting unpaid or cancelled bookings would let a
    // customer unlock a reward by making and dropping appointments.
    bookingsCount: facts.totalVisits,
    totalSpent: facts.totalSpend,
    referrals: 0,
    reviews: 0,
    currentTier: tier,
  };
}

/** A voucher reward type the database will accept. */
type VoucherRewardType =
  | "discount_pct"
  | "discount_fixed"
  | "free_service"
  | "credit_balance";

export interface PlannedBadgeReward {
  /** Null when the badge carries no reward, or one that cannot be issued. */
  rewardType: VoucherRewardType | null;
  rewardValue: number;
  appliesTo: string[] | null;
  /** Points instead of a voucher; zero for everything else. */
  points: number;
}

const NOTHING: PlannedBadgeReward = {
  rewardType: null,
  rewardValue: 0,
  appliesTo: null,
  points: 0,
};

/**
 * What a badge's configured reward becomes on a real account.
 *
 * The badges wizard offers seven reward types and the vouchers table accepts
 * four, so this is where the two vocabularies meet — deliberately in one place
 * rather than inline at the call site, because the mapping is where a reward
 * can quietly become the wrong thing.
 *
 * `gift_card` maps to NOTHING, and that is the honest answer rather than a gap:
 * there is no gift-card table in this database at all — the whole gift-card
 * feature is still fixtures. Turning it into account credit of the same dollar
 * value would be this code deciding something the facility did not.
 */
export function plannedBadgeReward(badge: Badge): PlannedBadgeReward {
  const reward = badge.reward;
  if (!reward) return NOTHING;

  const numeric = Number(reward.value);
  const positive = Number.isFinite(numeric) && numeric > 0;

  switch (reward.type) {
    case "points":
      // Points are not a voucher — they are the thing itself, and they post as
      // a ledger entry so the balance and its explanation stay one fact.
      return positive ? { ...NOTHING, points: Math.round(numeric) } : NOTHING;

    case "credit":
      return positive
        ? { ...NOTHING, rewardType: "credit_balance", rewardValue: numeric }
        : NOTHING;

    // `discount` is the legacy spelling of `discount_pct`, still present in
    // marketing badge data written before the enum was widened.
    case "discount":
    case "discount_pct":
      return positive
        ? { ...NOTHING, rewardType: "discount_pct", rewardValue: numeric }
        : NOTHING;

    case "discount_fixed":
      return positive
        ? { ...NOTHING, rewardType: "discount_fixed", rewardValue: numeric }
        : NOTHING;

    // A free service names a SERVICE, so its value is a string. The voucher's
    // `reward_value` is numeric and must be positive, so the name goes where a
    // name belongs — the scope — and the value counts the one service it is
    // good for. `computeVoucherDiscount` returns zero for this type, so it
    // takes nothing off a bill automatically; it is a reward staff honour.
    case "free_service":
    case "freebie":
      return {
        rewardType: "free_service",
        rewardValue: 1,
        appliesTo:
          typeof reward.value === "string" && reward.value.trim()
            ? [reward.value.trim()]
            : null,
        points: 0,
      };

    case "gift_card":
      return NOTHING;
  }
}

export interface EarnedBadge {
  id: string;
  name: string;
  icon: string;
  /** Already phrased, or null when nothing was given. */
  rewardText: string | null;
}

/**
 * Award every badge this account has newly earned, and issue what each carries.
 *
 * Returns only what was newly awarded, so a caller can tell somebody. An
 * account that has earned nothing new returns an empty list — which is the
 * common case and costs one indexed read.
 *
 * Failures are swallowed per badge, deliberately. This runs after a payment has
 * been taken and points have been awarded, and neither may be undone because a
 * badge did not record. A missing badge is visible and fixable; a reversed
 * checkout is not.
 */
export async function settleBadges(
  supabase: ServerClient,
  config: FacilityLoyaltyConfig,
  accountId: string,
  tier: Tier | null,
): Promise<EarnedBadge[]> {
  const badges = (config.badges ?? []).filter((b) => b.enabled !== false);
  if (badges.length === 0) return [];

  // Read FRESH, not passed in. The caller holds facts from before the award —
  // it needs them, because a customer earns at the tier they held when they
  // paid — and a badge measured against those would be one booking and one
  // payment behind the visit that just unlocked it.
  const facts = await readTierFacts(supabase, accountId);
  if (!facts) return [];

  const { data: awardRows } = await supabase
    .from("loyalty_badge_awards")
    .select("badge_id")
    .eq("account_id", accountId);

  const alreadyEarned = ((awardRows ?? []) as { badge_id: string }[]).map(
    (r) => r.badge_id,
  );

  const tiers =
    config.tiersEnabled === false ? [] : (config.tierDefinitions ?? []);

  const { newlyUnlocked } = evaluateBadges(
    badges,
    badgeStatsFor(facts, tier),
    tiers,
    alreadyEarned,
  );

  const earned: EarnedBadge[] = [];

  for (const badge of newlyUnlocked) {
    const plan = plannedBadgeReward(badge);

    // ── ONE CALL, BECAUSE THE TWO MUST NOT SEPARATE ──────────────────────
    //
    // The record and its reward move together in `award_loyalty_badge`. Doing
    // it in two statements from here would leave two ways to be wrong: a
    // reward issued to somebody the table does not say earned it, or a badge
    // recorded with nothing given for it. A concurrent second checkout raises
    // 23505 there and takes the reward back with it.
    const { error } = await supabase.rpc("award_loyalty_badge", {
      p_account_id: accountId,
      p_badge_id: badge.id,
      p_description: `Badge earned: ${badge.name}`,
      // Omitted rather than nulled when there is no reward: the function's
      // own defaults are what "no reward" means, and PostgREST drops an
      // undefined key rather than sending a null the signature refuses.
      ...(plan.rewardType
        ? {
            p_reward_type: plan.rewardType,
            p_reward_value: plan.rewardValue,
            ...(plan.appliesTo ? { p_applies_to: plan.appliesTo } : {}),
          }
        : {}),
      p_points: plan.points,
    });

    // 23505 is the once-only index doing its job — another request got there
    // first. The badge is earned, which is what the caller wanted; it is just
    // not this request's news to announce.
    if (error) continue;

    // Only what was actually GIVEN. A gift-card badge has a `reward` this
    // platform cannot issue, and a toast reading "$50 gift card" for something
    // nobody received is worse than saying nothing.
    const issued = plan.rewardType !== null || plan.points > 0;

    earned.push({
      id: badge.id,
      name: badge.name,
      icon: badge.icon,
      rewardText: issued && badge.reward ? badgeRewardText(badge.reward) : null,
    });
  }

  return earned;
}

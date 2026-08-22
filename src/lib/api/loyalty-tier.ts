import { recalculateTier } from "@/lib/loyalty/engine";
import { resolveTier, tierEarnMultiplier } from "@/lib/loyalty/engine-tier";
import type { createServerClient } from "@/lib/supabase/server";
import type {
  CustomerLoyaltyAccount,
  FacilityLoyaltyConfig,
  Tier,
} from "@/types/loyalty";

// ============================================================================
// Which tier a customer is in.
//
// ── WHAT WAS MISSING ──────────────────────────────────────────────────────
//
// `loyalty_accounts.current_tier_id` was a column a person set by hand. A
// facility could define Bronze/Silver/Gold with thresholds, a customer could
// sail past every one of them, and nothing moved them. The earn route said so
// out loud by passing a tier multiplier of 1 — every customer earned the base
// rate no matter what tier the screen said they were in.
//
// ── THE DECISION IS `recalculateTier`, NOT A SECOND COPY OF IT ────────────
//
// The rule has real edges: the highest qualifying tier wins across three
// different threshold dimensions, and a DOWNGRADE is suppressed unless the
// facility opted in — a customer keeps the tier they earned even when the
// thresholds move under them. Re-deriving that here would be a second
// implementation, and two implementations of "what tier is this customer in"
// disagree eventually.
//
// So the existing pure function makes the decision. What is dropped is its
// OUTPUT side: it also builds a fixture `RedemptionRecord` and a notification
// for the fixture bell. The voucher is issued through `redeem_loyalty_points`
// instead, so a tier-up reward is a real voucher on a real account.
//
// ── AND THE DIMENSIONS COME FROM THE VIEW ─────────────────────────────────
//
// `lifetimePointsEarned`, `totalSpend` and `totalVisits` — the second and third
// derived from bookings by `loyalty_account_overview`, because the account
// table deliberately does not store what another table owns. All three are
// monotonic, which is why recomputing a tier can never demote somebody for
// spending their points.
// ============================================================================

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

/** The parts of an account that tier resolution reads. */
export interface TierFacts {
  id: string;
  facilityId: string;
  currentTierId: string | null;
  tierJoinedAt: string | null;
  lifetimePointsEarned: number;
  totalSpend: number;
  totalVisits: number;
}

export interface TierSettlement {
  from: string | null;
  to: string | null;
  /** True only when the customer moved UP. A no-op change is not an upgrade. */
  upgraded: boolean;
  tier: Tier | null;
  /** True when reaching the tier also issued its one-time reward voucher. */
  rewarded: boolean;
}

/**
 * `recalculateTier` wants a whole `CustomerLoyaltyAccount` — the fixture shape,
 * with a numeric facility id and a dozen fields it never reads.
 *
 * It reads five: the three threshold dimensions and the two tier columns. The
 * rest are filled with values chosen to be obviously inert rather than
 * plausible, so anything that started reading them would break loudly instead
 * of quietly believing a customer had no credit and no referrals.
 */
function asAccount(facts: TierFacts): CustomerLoyaltyAccount {
  return {
    id: facts.id,
    facilityId: 0,
    customerId: 0,
    pointsBalance: 0,
    lifetimePointsEarned: facts.lifetimePointsEarned,
    lifetimePointsRedeemed: 0,
    creditBalance: 0,
    currentTierId: facts.currentTierId,
    tierJoinedAt: facts.tierJoinedAt,
    totalSpend: facts.totalSpend,
    totalVisits: facts.totalVisits,
    referralCode: "",
    referralCount: 0,
    createdAt: facts.tierJoinedAt ?? new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

/** Read what tier resolution needs, through the view that derives it. */
export async function readTierFacts(
  supabase: ServerClient,
  accountId: string,
): Promise<TierFacts | null> {
  const { data } = await supabase
    .from("loyalty_account_overview")
    .select(
      "id, facility_id, current_tier_id, tier_joined_at, lifetime_points_earned, total_spend, total_visits",
    )
    .eq("id", accountId)
    .maybeSingle();

  const row = data as {
    id: string;
    facility_id: string;
    current_tier_id: string | null;
    tier_joined_at: string | null;
    lifetime_points_earned: number;
    total_spend: string | number;
    total_visits: number;
  } | null;
  if (!row) return null;

  return {
    id: row.id,
    facilityId: row.facility_id,
    currentTierId: row.current_tier_id,
    tierJoinedAt: row.tier_joined_at,
    lifetimePointsEarned: row.lifetime_points_earned,
    totalSpend: Number(row.total_spend),
    totalVisits: row.total_visits,
  };
}

/**
 * The tier a customer holds RIGHT NOW, for anything that needs to price at it.
 *
 * Deliberately the stored tier rather than the one they are about to reach:
 * somebody earns at the tier they held when they spent, not at the one that
 * spend pushes them into. Awarding the new tier's multiplier on the very
 * transaction that unlocked it would pay the bonus a purchase earlier than the
 * customer was ever promised it.
 */
export function heldTier(
  config: FacilityLoyaltyConfig,
  facts: TierFacts,
): Tier | null {
  if (config.tiersEnabled === false) return null;
  const tiers = config.tierDefinitions ?? [];
  return tiers.find((t) => t.id === facts.currentTierId) ?? null;
}

/**
 * The tier the account QUALIFIES for right now, computed rather than stored.
 *
 * Not the same question as {@link heldTier}. The stored `current_tier_id` only
 * moves when something moves the points — an earn or an adjustment — so a
 * facility that adds a tier, or a customer who has not transacted since one was
 * added, has a stored tier that lags what they have plainly earned.
 *
 * The customer's own wallet shows THIS one: being told you are in no tier while
 * holding fifteen thousand lifetime points is not a state anybody would accept
 * as an explanation. The stored column is what the earn multiplier reads, and
 * it catches up on their next transaction.
 */
export function qualifyingTier(
  config: FacilityLoyaltyConfig,
  facts: TierFacts,
): Tier | null {
  if (config.tiersEnabled === false) return null;
  const tiers = config.tierDefinitions ?? [];
  if (tiers.length === 0) return null;
  return resolveTier(tiers, asAccount(facts));
}

/** The points multiplier the held tier grants (1 when there is none). */
export function heldTierMultiplier(
  config: FacilityLoyaltyConfig,
  facts: TierFacts,
): number {
  return tierEarnMultiplier(heldTier(config, facts));
}

/**
 * Work out the tier the account now qualifies for and persist it.
 *
 * Returns what moved so a caller can issue the tier-up reward and tell somebody.
 * A no-op is reported honestly — `upgraded: false` with `from === to` — rather
 * than as an absence.
 */
export async function settleTier(
  supabase: ServerClient,
  config: FacilityLoyaltyConfig,
  accountId: string,
): Promise<TierSettlement> {
  const facts = await readTierFacts(supabase, accountId);
  if (!facts) {
    return {
      from: null,
      to: null,
      upgraded: false,
      tier: null,
      rewarded: false,
    };
  }

  const tiers =
    config.tiersEnabled === false ? [] : (config.tierDefinitions ?? []);

  // ── NO TIERS MEANS NO TIER, WHICH `recalculateTier` DOES NOT SAY ────────
  //
  // The pure function returns UNCHANGED when there is nothing to resolve
  // against, so a facility that switches tiers off leaves every customer
  // pointing at an id nothing defines any more. The row then says "Silver"
  // while every screen renders "—", because they look the id up in the
  // facility's definitions and miss.
  //
  // A row that disagrees with every screen reading it is not history, it is a
  // lie with a long life. So this clears it — and nothing is lost by doing so:
  // the three threshold dimensions only ever increase, so turning tiers back on
  // restores the customer to the same tier on their next settle.
  //
  // Deliberately here and not in `recalculateTier`: that function is shared
  // with the fixture engine, and changing what it returns would change a
  // behaviour two callers depend on to fix a problem only this one has.
  if (tiers.length === 0) {
    if (facts.currentTierId !== null) {
      await supabase
        .from("loyalty_accounts")
        .update({ current_tier_id: null, tier_joined_at: null })
        .eq("id", accountId);
    }
    return {
      from: facts.currentTierId,
      to: null,
      upgraded: false,
      tier: null,
      rewarded: false,
    };
  }

  const result = recalculateTier(
    asAccount(facts),
    config,
    new Date().toISOString(),
  );

  if (result.currentTierId === facts.currentTierId) {
    return {
      from: facts.currentTierId,
      to: facts.currentTierId,
      upgraded: false,
      tier: tiers.find((t) => t.id === facts.currentTierId) ?? null,
      rewarded: false,
    };
  }

  // The two tier columns are NOT the trigger-guarded ones — that guard covers
  // the points and credit balances, which follow the ledger. A tier is a
  // derived fact about an account and belongs on the row.
  const { error } = await supabase
    .from("loyalty_accounts")
    .update({
      current_tier_id: result.currentTierId,
      tier_joined_at: result.tierJoinedAt,
    })
    .eq("id", accountId);

  if (error) {
    // The caller has already awarded points and must not fail because a tier
    // did not move. Reported as unchanged, which is what is true of the row.
    return {
      from: facts.currentTierId,
      to: facts.currentTierId,
      upgraded: false,
      tier: tiers.find((t) => t.id === facts.currentTierId) ?? null,
      rewarded: false,
    };
  }

  const reached = tiers.find((t) => t.id === result.currentTierId) ?? null;
  const upgraded = result.tierChange?.direction === "upgrade";

  // ── THE TIER-UP REWARD IS ISSUED HERE, NOT BY THE CALLER ────────────────
  //
  // It lived in the earn route first, which meant a customer promoted by a
  // BOOKING got their reward and one promoted by a staff adjustment did not —
  // the same tier, reached the same day, worth different things depending on
  // how the points arrived. Reaching a tier is reaching it.
  //
  // `points: 0`, because a tier reward is something the facility gives rather
  // than something the customer buys. And a failure here does not undo the
  // promotion: they have reached the tier either way, and a missing voucher is
  // visible on their account in a way an un-awarded tier would not be.
  let rewarded = false;
  if (upgraded && reached?.tierUpReward) {
    const reward = reached.tierUpReward;
    const { error: rewardError } = await supabase.rpc("redeem_loyalty_points", {
      p_account_id: accountId,
      p_reward_type: reward.type === "credit" ? "credit_balance" : reward.type,
      p_reward_value: reward.value,
      p_points: 0,
      p_description: `Reaching ${reached.name}`,
    });
    rewarded = !rewardError;
  }

  return {
    from: facts.currentTierId,
    to: result.currentTierId,
    upgraded,
    tier: reached,
    rewarded,
  };
}

/** Exported for the tests that pin the threshold arithmetic down. */
export { resolveTier };

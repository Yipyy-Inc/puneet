import { NextResponse } from "next/server";

import { qualifyingTier } from "@/lib/api/loyalty-tier";
import { getActiveEarnRules } from "@/lib/loyalty/earn-rule-versioning";
import { tierBenefitList } from "@/lib/loyalty/tier-notification";
import { NO_LOYALTY_PROGRAM } from "@/lib/settings/loyalty";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { EarnRule, FacilityLoyaltyConfig, Tier } from "@/types/loyalty";

// ============================================================================
// A customer's own loyalty standing.
//
// ── WHY THIS IS NOT /api/loyalty/accounts ─────────────────────────────────
//
// That route resolves the facility through `getFacilityContext()`, which reads
// the caller's MEMBERSHIP — and for a caller with none it falls back to the
// DEMO facility. A customer has no membership. Pointing the wallet at it would
// have shown a pet owner a balance from a business they have never been to, or
// nothing at all, depending on whose demo data happened to be there.
//
// The facility comes through the CLIENT ROW instead, exactly as
// `/api/customer/facility` does it. That is the same reasoning written down
// twice now, which is a sign it is the rule rather than a special case.
//
// ── ONE ROUND TRIP, AND ONLY WHAT A CUSTOMER MAY SEE ──────────────────────
//
// The wallet needs the account, its history, the rewards it can still spend,
// and the shape of the programme. Four requests to build one screen, each
// re-deriving the same client row, is four chances to disagree — so this
// answers all of it at once, from one resolution of who is asking.
//
// The programme is CURATED here, not passed through. `loyalty_config` became
// readable to a client in 20260822100000 because a programme is advertised, but
// a route that spread the whole document would hand over whatever a facility
// adds to it next. What comes back is what the screen shows.
//
// ── AND RLS IS STILL THE BOUNDARY ─────────────────────────────────────────
//
// Every read below runs as the caller. `loyalty_accounts_read` admits a client
// to their own row via `private.own_client_ids()`; the transactions and voucher
// policies follow the account. Somebody naming a client that is not theirs gets
// nothing, because the client row is refused first.
// ============================================================================

export const dynamic = "force-dynamic";

export interface CustomerTier {
  id: string;
  name: string;
  icon: string;
  color: string;
  /** What the customer needs on this tier's own dimension. */
  thresholdType: "points" | "spend" | "visits";
  thresholdValue: number;
  /** Already phrased for a person to read. */
  benefits: string[];
}

export interface CustomerLoyaltyPayload {
  /** False when the facility runs no programme — the screen says so. */
  enabled: boolean;
  programName: string | null;
  /** What this facility calls a point. */
  pointsName: string;
  /** Points per $1 of credit when the customer redeems. */
  redemptionRate: number;
  minimumRedemptionPoints: number;
  /** Null when the customer has never been enrolled. Not the same as zero. */
  account: {
    id: string;
    pointsBalance: number;
    lifetimePointsEarned: number;
    lifetimePointsRedeemed: number;
    creditBalance: number;
    totalSpend: number;
    totalVisits: number;
    /**
     * The tier they QUALIFY for, computed from their own totals.
     *
     * Not the stored `current_tier_id`, which only moves when something moves
     * the points — so a customer who has not transacted since their facility
     * added a tier would be told they are in none while plainly having earned
     * one. The stored column is what the earn multiplier reads and catches up
     * on their next transaction; this is what they are shown.
     */
    currentTierId: string | null;
    referralCode: string | null;
  } | null;
  /** The ladder, lowest first, so a screen can draw progress along it. */
  tiers: CustomerTier[];
  /**
   * How points are earned here — the ACTIVE rules, archived versions excluded.
   *
   * Passed whole rather than curated: these are the rules the facility
   * advertises, they are the ones that actually award, and the wallet already
   * knows how to phrase them. A customer reading a different list from the one
   * the server awards by is the mismatch this whole conversion has been about.
   */
  earnRules: EarnRule[];
  transactions: {
    id: string;
    points: number;
    description: string;
    createdAt: string;
    kind: string;
  }[];
  /** Rewards they hold and can still spend. */
  rewards: {
    id: string;
    rewardType: string;
    rewardValue: number;
    expiresAt: string | null;
    appliesToServices: string[] | null;
  }[];
}

function toCustomerTier(tier: Tier): CustomerTier {
  return {
    id: tier.id,
    name: tier.name,
    icon: tier.icon,
    color: tier.color,
    thresholdType: tier.thresholdType,
    thresholdValue: tier.thresholdValue,
    // Phrased by `tierBenefitList`, which is what the tier-upgrade email
    // already says. A benefit is a `type` and a `value` in the config — the
    // sentence a customer reads should not be written twice and drift.
    benefits: tierBenefitList(tier),
  };
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  // The caller's own client row. RLS admits a customer to theirs alone, so this
  // is both the lookup and the authorisation.
  const { data: clientRow } = await supabase
    .from("clients")
    .select("id, facility_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  const client = clientRow as { id: string; facility_id: string } | null;
  if (!client) {
    return NextResponse.json(
      { error: "You are not a client of any facility." },
      { status: 404 },
    );
  }

  const [settingResult, accountResult] = await Promise.all([
    supabase
      .from("facility_settings")
      .select("value")
      .eq("facility_id", client.facility_id)
      .eq("domain", "loyalty_config")
      .maybeSingle(),
    supabase
      .from("loyalty_account_overview")
      .select(
        "id, points_balance, lifetime_points_earned, lifetime_points_redeemed, credit_balance, total_spend, total_visits, current_tier_id, referral_code",
      )
      .eq("client_id", client.id)
      .maybeSingle(),
  ]);

  const config = {
    ...NO_LOYALTY_PROGRAM,
    ...((settingResult.data as { value?: Record<string, unknown> } | null)
      ?.value ?? {}),
    facilityId: 0,
  } as unknown as FacilityLoyaltyConfig;

  const accountRow = accountResult.data as {
    id: string;
    points_balance: number;
    lifetime_points_earned: number;
    lifetime_points_redeemed: number;
    credit_balance: string | number;
    total_spend: string | number;
    total_visits: number;
    current_tier_id: string | null;
    referral_code: string | null;
  } | null;

  const account = accountRow
    ? {
        id: accountRow.id,
        pointsBalance: accountRow.points_balance,
        lifetimePointsEarned: accountRow.lifetime_points_earned,
        lifetimePointsRedeemed: accountRow.lifetime_points_redeemed,
        creditBalance: Number(accountRow.credit_balance),
        totalSpend: Number(accountRow.total_spend),
        totalVisits: accountRow.total_visits,
        currentTierId:
          qualifyingTier(config, {
            id: accountRow.id,
            facilityId: client.facility_id,
            currentTierId: accountRow.current_tier_id,
            tierJoinedAt: null,
            lifetimePointsEarned: accountRow.lifetime_points_earned,
            totalSpend: Number(accountRow.total_spend),
            totalVisits: accountRow.total_visits,
          })?.id ?? null,
        referralCode: accountRow.referral_code,
      }
    : null;

  // History and rewards only when there is an account to hang them on. A
  // customer who has never been enrolled has neither, and asking for them would
  // be two requests guaranteed to come back empty.
  let transactions: CustomerLoyaltyPayload["transactions"] = [];
  let rewards: CustomerLoyaltyPayload["rewards"] = [];

  if (account) {
    const [txnResult, voucherResult] = await Promise.all([
      supabase
        .from("loyalty_transactions")
        .select("id, points, description, created_at, kind")
        .eq("account_id", account.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("loyalty_vouchers")
        .select(
          "id, reward_type, reward_value, expires_at, applies_to_services",
        )
        .eq("account_id", account.id)
        .eq("status", "active")
        // Expiry against the DATABASE's clock. A customer's device telling them
        // a reward is still good is not evidence that it is.
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("issued_at", { ascending: false }),
    ]);

    transactions = (
      (txnResult.data ?? []) as {
        id: string;
        points: number;
        description: string;
        created_at: string;
        kind: string;
      }[]
    ).map((t) => ({
      id: t.id,
      points: t.points,
      description: t.description,
      createdAt: t.created_at,
      kind: t.kind,
    }));

    rewards = (
      (voucherResult.data ?? []) as {
        id: string;
        reward_type: string;
        reward_value: string | number;
        expires_at: string | null;
        applies_to_services: string[] | null;
      }[]
    ).map((v) => ({
      id: v.id,
      rewardType: v.reward_type,
      rewardValue: Number(v.reward_value),
      expiresAt: v.expires_at,
      appliesToServices: v.applies_to_services,
    }));
  }

  const tiers =
    config.tiersEnabled === false
      ? []
      : [...(config.tierDefinitions ?? [])]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(toCustomerTier);

  return NextResponse.json({
    enabled: config.enabled === true,
    programName: config.programName ?? null,
    pointsName: config.settings?.pointsName ?? "points",
    redemptionRate: config.redemptionRate ?? 100,
    minimumRedemptionPoints: config.settings?.minimumRedemptionPoints ?? 0,
    account,
    tiers,
    earnRules: getActiveEarnRules(config.earnRules ?? []),
    transactions,
    rewards,
  } satisfies CustomerLoyaltyPayload);
}

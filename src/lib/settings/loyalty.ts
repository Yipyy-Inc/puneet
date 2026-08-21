import { z } from "zod";

import type {
  Badge,
  DiscountStackingConfig,
  EarnRule,
  FacilityLoyaltyConfig,
  LoyaltyNotificationSettings,
  LoyaltyTierConfig,
  PointsEarningRule,
  PointsExpirationConfig,
  PointsScopeConfig,
  ReferralProgram,
  ReferralProgramConfig,
  RewardTypeConfig,
  SpecialEventRewardsConfig,
  Tier,
} from "@/types/loyalty";

// ============================================================================
// A facility's loyalty programme.
//
// ── WHERE IT LIVED ────────────────────────────────────────────────────────
//
// `localStorage`, under the key `loyalty-program-1`.
//
// Both halves of that are wrong. `localStorage` means the programme was
// whatever the browser in front of you remembered: an owner set an earn rule,
// watched it stick, and every other member of staff, every other device and
// every customer went on seeing the seed file. And the `1` is
// `DEFAULT_LOYALTY_FACILITY_ID`, a hardcoded constant — so every facility on
// the platform shared one key, and a second facility signing in on the same
// browser would have read the first one's programme.
//
// This is the same bug `facility_settings` was built to end, and it is the
// third time it has been found: opening hours and booking rules were per
// browser until 2026-08-19, surcharges and discounts until 2026-08-20.
//
// ── THE FALLBACK IS OFF, AND EMPTY ────────────────────────────────────────
//
// `enabled: false`, no tiers, no badges, no earn rules. NOT the fixture's
// programme, which is a fully-populated four-tier scheme with badges and a
// referral bonus.
//
// The old loader did the opposite on purpose — `resolveBaseConfig` seeded
// badges, earn rules and tiers from fixtures "so the Badges editor is never
// empty on first load". An empty editor is a real state and a facility is
// entitled to see it. A populated one that nobody chose is a programme the
// platform invented on their behalf, and points have value: they are a
// liability a facility owes its customers.
//
// The wizard's defaults are not lost — they stay as an explicit
// "start from this" template a facility can apply. `configured` is what
// separates a template offered from a programme chosen, and it is the whole
// reason `SettingState` carries that flag.
//
// ── HOW MUCH OF THIS IS VALIDATED, AND HOW MUCH IS NOT ────────────────────
//
// Honestly: the decision-bearing fields, and not the deep trees.
//
// `enabled`, `redemptionRate`, `discountSelectionStrategy`, `tiersEnabled`,
// `pointsExpiryDays`, and the `settings` block are checked field by field —
// they decide what a customer is owed and what a screen charges, and a bad
// value in one of them is money.
//
// The nested structures — an `EarnRule`, a `Tier`, a `PointsScopeConfig` —
// are checked as OBJECTS of their declared TypeScript type and no further.
// Restating those eight interfaces as Zod would be several hundred lines of
// second copy, and the failure mode of a second copy is not "invalid data gets
// through", it is "the copy drifts and refuses a save a facility legitimately
// made". TypeScript already types every editor that writes them.
//
// `z.custom<T>` is what buys that: the inferred type is exactly the interface,
// so `LoyaltyProgramConfig` stays assignable to `FacilityLoyaltyConfig` and no
// consumer needs a cast, while the runtime check stays deliberately shallow.
// When a nested tree earns strict validation, it earns it one at a time.
//
// ── THE LEGACY/NEW PAIRS ARE KEPT, NOT BLESSED ────────────────────────────
//
// `FacilityLoyaltyConfig` carries four fields twice over: `pointsEarning` and
// `earnRules`, `tiers` and `tierDefinitions`, `pointsExpiration` and
// `pointsExpiryEnabled`/`pointsExpiryDays`, `referralProgram` and
// `referralProgramSetup`. In every pair the engine reads the older one and the
// admin UI edits the newer.
//
// All four are kept here. Dropping a legacy side would silently stop the
// engine, and this change is about where the programme is STORED, not about
// which of two models wins — folding that into the same commit would make both
// impossible to review. Recorded in the debt map instead.
// ============================================================================

/**
 * An object of the declared type, checked as an object and no further.
 *
 * See the banner: the inferred type is exact, the runtime check is shallow,
 * and that asymmetry is deliberate rather than an oversight.
 */
function shaped<T>() {
  return z.custom<T>(
    (value) => typeof value === "object" && value !== null,
    "Expected an object.",
  );
}

function shapedArray<T>() {
  return z.array(shaped<T>());
}

/** What a point is called and what it is worth. */
export const loyaltySettingsSchema = z.object({
  /** "points", "bones", "paws" — whatever the facility calls them. */
  pointsName: z.string().default("points"),
  /**
   * Dollars per point when a reward is valued. NOT the redemption rate below:
   * this is what a point is WORTH (for the liability report), that is how many
   * of them buy a dollar of credit.
   */
  pointsValue: z.number().min(0).default(0.01),
  minimumRedemptionPoints: z.number().min(0).optional(),
  maximumRedemptionPerTransaction: z.number().min(0).optional(),
  allowPartialRedemption: z.boolean().optional(),
  showPointsOnReceipt: z.boolean().optional(),
  showPointsInPortal: z.boolean().optional(),
  allowPointsTransfer: z.boolean().optional(),
});

export const loyaltyConfigSchema = z.object({
  /**
   * False means the programme is OFF — no points are earned and no voucher is
   * offered at checkout.
   *
   * Unlike an absent overtime rule, silence here is safe: nobody is underpaid
   * and no customer is overcharged by a programme that is not running. What is
   * NOT safe is inheriting a programme nobody chose, which is why the fallback
   * is off rather than the fixture's.
   */
  enabled: z.boolean().default(false),

  programName: z.string().optional(),
  programDescription: z.string().optional(),
  primaryColor: z.string().optional(),
  programIcon: z.string().optional(),

  // ── Earning ─────────────────────────────────────────────────────────────
  /** Legacy single rule; still what `calculatePointsEarned` reads. */
  pointsEarning: shaped<PointsEarningRule>(),
  /** The newer trigger-based rules the Earn Rules tab edits. */
  earnRules: shapedArray<EarnRule>().optional(),

  // ── Expiry ──────────────────────────────────────────────────────────────
  pointsExpiration: shaped<PointsExpirationConfig>(),
  pointsExpiryEnabled: z.boolean().optional(),
  /**
   * Days of inactivity before points expire.
   *
   * Bounded at one day: a zero here with expiry ON would expire every point
   * the moment it was earned. Same reasoning as the payroll threshold — a
   * value that voids the thing it configures is far likelier a half-finished
   * form than a rule anybody meant.
   */
  pointsExpiryDays: z.number().int().min(1).max(3650).optional(),

  // ── Tiers ───────────────────────────────────────────────────────────────
  /** Legacy tier list; still what `getCustomerTier` reads. */
  tiers: shapedArray<LoyaltyTierConfig>(),
  /** The newer definitions the Tiers tab edits. */
  tierDefinitions: shapedArray<Tier>().optional(),
  tiersEnabled: z.boolean().optional(),
  /** Off by default: a customer keeps the tier they earned. */
  tierDowngradeEnabled: z.boolean().optional(),

  // ── Redeeming ───────────────────────────────────────────────────────────
  /**
   * Which single voucher to apply when a customer holds several.
   *
   * This one reaches a card. `useActiveLoyaltyDiscount` reads it, and the
   * checkout subtracts the chosen voucher from what is charged.
   */
  discountSelectionStrategy: z
    .enum(["highest_value", "most_specific"])
    .optional(),
  /**
   * Points per $1 of account credit — 100 means 100 points buy a dollar.
   *
   * Positive, always. A zero would make a dollar cost nothing and hand every
   * customer unlimited credit; a negative would pay them to spend.
   */
  redemptionRate: z.number().positive().max(1_000_000).optional(),

  rewardTypes: shapedArray<RewardTypeConfig>(),
  badges: shapedArray<Badge>().optional(),

  // ── Scope, stacking, referrals, notifications ───────────────────────────
  pointsScope: shaped<PointsScopeConfig>(),
  discountStacking: shaped<DiscountStackingConfig>(),
  /** Legacy nested referral config; kept for back-compat. */
  referralProgram: shaped<ReferralProgramConfig>().optional(),
  /** The canonical flat setup the referral wizard edits. */
  referralProgramSetup: shaped<ReferralProgram>().optional(),
  notificationSettings: shaped<LoyaltyNotificationSettings>().optional(),
  specialEventRewards: shaped<SpecialEventRewardsConfig>().optional(),

  settings: loyaltySettingsSchema,

  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
});

/**
 * The stored programme.
 *
 * `facilityId` is deliberately absent. The row's own `facility_id` says whose
 * programme this is; carrying a second copy inside the value is how the
 * hardcoded `1` survived as long as it did. `LoyaltyProgramProvider` puts the
 * field back for the consumers that still read it.
 */
export type LoyaltyProgramConfig = z.infer<typeof loyaltyConfigSchema>;

/** The stored programme is assignable to what every consumer already expects. */
type _AssignableToFacilityConfig =
  LoyaltyProgramConfig extends Omit<FacilityLoyaltyConfig, "facilityId">
    ? true
    : never;
/** Fails the build if the two drift apart. */
export type LoyaltyConfigMatchesAppType = _AssignableToFacilityConfig;

const EPOCH = "1970-01-01T00:00:00.000Z";

/**
 * No programme, until a facility says otherwise.
 *
 * Every list empty and `enabled: false`. See the banner: the fixture's
 * four-tier scheme is a template to offer, not a default to inherit.
 */
export const NO_LOYALTY_PROGRAM: LoyaltyProgramConfig = {
  enabled: false,
  pointsEarning: {
    id: "default",
    method: "per_dollar",
    perDollar: { enabled: false, basePoints: 1 },
  } as PointsEarningRule,
  earnRules: [],
  pointsExpiration: {
    enabled: false,
    expirationType: "none",
  } as PointsExpirationConfig,
  pointsExpiryEnabled: false,
  tiers: [],
  tierDefinitions: [],
  tiersEnabled: true,
  tierDowngradeEnabled: false,
  discountSelectionStrategy: "highest_value",
  redemptionRate: 100,
  rewardTypes: [],
  badges: [],
  pointsScope: { enabled: false, scope: "both" } as PointsScopeConfig,
  discountStacking: {
    enabled: false,
    stackingBehavior: "no_stacking",
  } as DiscountStackingConfig,
  settings: {
    pointsName: "points",
    pointsValue: 0.01,
  },
  createdAt: EPOCH,
  updatedAt: EPOCH,
};

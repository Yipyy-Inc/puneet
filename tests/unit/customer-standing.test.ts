import { describe, expect, test } from "bun:test";

import { customerStanding } from "@/lib/loyalty/customer-standing";
import type {
  CustomerLoyaltyPayload,
  CustomerTier,
} from "@/app/api/customer/loyalty/route";

// ============================================================================
// The ladder arithmetic, pinned before two screens started sharing it.
//
// The dashboard used to answer this from a fixture keyed on `clientId: 15` —
// Alice Johnson's real ref — against one global tier list. The rewards page
// answered it correctly from the facility's own tiers. Extracting the correct
// one is only safe if its behaviour is measured, particularly the part the
// fixture version never had: a threshold counted in spend or visits rather
// than points.
// ============================================================================

const tier = (
  id: string,
  thresholdType: CustomerTier["thresholdType"],
  thresholdValue: number,
): CustomerTier => ({
  id,
  name: id,
  icon: "star",
  color: "#1668E3",
  thresholdType,
  thresholdValue,
  benefits: [],
});

const wallet = (
  over: Partial<CustomerLoyaltyPayload> = {},
): CustomerLoyaltyPayload =>
  ({
    enabled: true,
    programName: "Paws Club",
    pointsName: "points",
    redemptionRate: 100,
    minimumRedemptionPoints: 100,
    account: {
      id: "a1",
      pointsBalance: 120,
      lifetimePointsEarned: 300,
      lifetimePointsRedeemed: 0,
      creditBalance: 5,
      totalSpend: 400,
      totalVisits: 6,
      currentTierId: "silver",
      referralCode: null,
    },
    tiers: [
      tier("bronze", "points", 0),
      tier("silver", "points", 200),
      tier("gold", "points", 500),
    ],
    earnRules: [],
    transactions: [],
    ...over,
  }) as CustomerLoyaltyPayload;

describe("where a customer stands", () => {
  test("no programme is not zero points — it is nothing to show", () => {
    expect(customerStanding(wallet({ enabled: false }))).toBeNull();
    expect(customerStanding(null)).toBeNull();
    expect(customerStanding(undefined)).toBeNull();
  });

  test("the balance shown is spendable, not lifetime", () => {
    // 120 spendable of 300 ever earned. Showing the lifetime number tells
    // somebody they can redeem points they have already spent.
    expect(customerStanding(wallet())!.points).toBe(120);
  });

  test("progress runs between the two tiers, on lifetime points", () => {
    const s = customerStanding(wallet())!;
    expect(s.currentTier?.id).toBe("silver");
    expect(s.nextTier?.id).toBe("gold");
    // 300 earned, gold wants 500, silver's floor is 200 → 100 of 300.
    expect(s.towardNextTier).toBe(300);
    expect(s.toNextTier).toBe(200);
    expect(Math.round(s.progressPercentage)).toBe(33);
  });

  test("a visits tier is counted in visits, not points", () => {
    // The bug the fixture ladder could not express: 6 visits of 10, NOT
    // "200 points away".
    const s = customerStanding(
      wallet({
        tiers: [
          tier("bronze", "points", 0),
          tier("silver", "points", 200),
          tier("regular", "visits", 10),
        ],
      }),
    )!;
    expect(s.nextTier?.id).toBe("regular");
    expect(s.towardNextTier).toBe(6);
    expect(s.toNextTier).toBe(4);
    expect(Math.round(s.progressPercentage)).toBe(60);
  });

  test("tiers counting different things do not share a floor", () => {
    // Silver's 200 POINTS must not be subtracted from a SPEND axis, which
    // would have read 400-200 of 800-200 = 33% instead of 50%.
    const s = customerStanding(
      wallet({
        tiers: [
          tier("silver", "points", 200),
          tier("bigspender", "spend", 800),
        ],
      }),
    )!;
    expect(s.nextTier?.id).toBe("bigspender");
    expect(Math.round(s.progressPercentage)).toBe(50);
  });

  test("at the top of the ladder there is no next tier and no bar", () => {
    const s = customerStanding(
      wallet({ tiers: [tier("bronze", "points", 0)] }),
    )!;
    expect(s.nextTier).toBeNull();
    expect(s.toNextTier).toBe(0);
    expect(s.progressPercentage).toBe(0);
  });

  test("never enrolled reads as zero, not as a crash", () => {
    const s = customerStanding(wallet({ account: null }))!;
    expect(s.points).toBe(0);
    expect(s.currentTier).toBeNull();
    // The first tier above zero is still what they are working toward.
    expect(s.nextTier?.id).toBe("silver");
  });

  test("progress is clamped, so a stale tier cannot overflow the bar", () => {
    const s = customerStanding(
      wallet({
        tiers: [tier("silver", "points", 200), tier("gold", "points", 250)],
      }),
    )!;
    // 300 earned already passes gold's 250, so `nextTier` is null here —
    // the guard that matters is that nothing returns above 100 or below 0.
    expect(s.progressPercentage).toBeGreaterThanOrEqual(0);
    expect(s.progressPercentage).toBeLessThanOrEqual(100);
  });
});

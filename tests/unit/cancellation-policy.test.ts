import { describe, expect, test } from "bun:test";

import {
  NO_CANCELLATION_POLICIES,
  cancellationPolicySchema,
  policyDecidesAnything,
  resolveTier,
  seedFromExisting,
  type CancellationTier,
} from "@/lib/settings/cancellation";

// ── WHAT THESE PIN ────────────────────────────────────────────────────────
//
// `resolveTier` decides which of a facility's tiers applies to a cancellation,
// and Phase 3 turns that into a dollar figure in SQL. Two implementations of
// one rule is the exact shape of the time-fee bug this round started with, so
// the rule is written once, asserted here, and never re-derived.
//
// The rest guard the domain against the failure that would be worst and
// quietest: `settingsFromRows` DROPS a domain whose stored value stops
// parsing, so a field that became required would delete every facility's
// policy on the deploy that added it.

function tier(
  minNoticeHours: number,
  id = `t${minNoticeHours}`,
): CancellationTier {
  return {
    id,
    minNoticeHours,
    charge: { kind: "none" },
    refund: "original",
  };
}

describe("which tier applies", () => {
  test("the most notice the customer actually managed wins", () => {
    const tiers = [tier(0), tier(24), tier(72)];
    expect(resolveTier(tiers, 100)?.id).toBe("t72");
    expect(resolveTier(tiers, 48)?.id).toBe("t24");
    expect(resolveTier(tiers, 3)?.id).toBe("t0");
  });

  test("the array's own order does not decide it", () => {
    // The editor lets a facility drag these around. Order is presentation.
    const jumbled = [tier(24), tier(72), tier(0)];
    expect(resolveTier(jumbled, 100)?.id).toBe("t72");
    expect(resolveTier(jumbled, 30)?.id).toBe("t24");
  });

  // The boundary is >=, and it is the cheaper side on purpose: a customer on
  // the line is not charged the stricter tier for being punctual to the second.
  test("exactly on the boundary gets that tier, not the one below", () => {
    const tiers = [tier(0), tier(72)];
    expect(resolveTier(tiers, 72)?.id).toBe("t72");
    expect(resolveTier(tiers, 71.99)?.id).toBe("t0");
  });

  // The one that would cost a customer money if it were ever "helpfully"
  // relaxed: a facility that wrote three tiers starting at 24 hours did not
  // write a rule for two hours' notice, and inventing one charges money
  // nobody agreed to.
  test("with no catch-all, nothing applies inside every window", () => {
    const tiers = [tier(24), tier(72)];
    expect(resolveTier(tiers, 2)).toBeNull();
    expect(resolveTier(tiers, 0)).toBeNull();
  });

  test("a tier at zero is the catch-all", () => {
    expect(resolveTier([tier(0), tier(24)], 0)?.id).toBe("t0");
  });

  test("no tiers, or nonsense notice, decides nothing", () => {
    expect(resolveTier([], 10)).toBeNull();
    expect(resolveTier(undefined, 10)).toBeNull();
    expect(resolveTier([tier(0)], Number.NaN)).toBeNull();
  });

  test("notice in the past is treated as none, not as negative", () => {
    // A booking that already started. It cannot qualify for a 24h tier by
    // having "-5" hours of notice be less than 24.
    const tiers = [tier(0), tier(24)];
    expect(resolveTier(tiers, -5)?.id).toBe("t0");
    expect(resolveTier([tier(24)], -5)).toBeNull();
  });
});

describe("a policy that decides nothing", () => {
  test("disabled, empty, or absent all fall through", () => {
    expect(policyDecidesAnything(undefined)).toBe(false);
    expect(
      policyDecidesAnything({
        enabled: false,
        customerMayCancel: "instant",
        tiers: [tier(0)],
      }),
    ).toBe(false);
    expect(
      policyDecidesAnything({
        enabled: true,
        customerMayCancel: "instant",
        tiers: [],
      }),
    ).toBe(false);
  });

  test("enabled with a tier decides", () => {
    expect(
      policyDecidesAnything({
        enabled: true,
        customerMayCancel: "instant",
        tiers: [tier(0)],
      }),
    ).toBe(true);
  });
});

describe("the stored value survives", () => {
  // `settingsFromRows` drops a domain that stops parsing, and here the
  // fallback means CHARGE NOTHING — so a required field would quietly delete
  // a facility's whole cancellation revenue on deploy.
  test("an empty object parses", () => {
    expect(cancellationPolicySchema.parse({})).toEqual(
      NO_CANCELLATION_POLICIES,
    );
  });

  test("a service with nothing but a name parses, and decides nothing", () => {
    const parsed = cancellationPolicySchema.parse({
      services: { boarding: {} },
    });
    expect(parsed.services.boarding.enabled).toBe(false);
    expect(parsed.services.boarding.tiers).toEqual([]);
    expect(policyDecidesAnything(parsed.services.boarding)).toBe(false);
  });

  test("a tier with nothing but a window parses as no charge", () => {
    const parsed = cancellationPolicySchema.parse({
      services: {
        grooming: { enabled: true, tiers: [{ minNoticeHours: 24 }] },
      },
    });
    expect(parsed.services.grooming.tiers[0].charge).toEqual({ kind: "none" });
    expect(parsed.services.grooming.tiers[0].refund).toBe("original");
  });

  // Safe means UNCHANGED, not "the strictest thing available". Today a
  // customer can cancel instantly; defaulting to "request" would silently
  // remove a shipped capability from every facility on the platform.
  test("an absent customerMayCancel is instant, not request", () => {
    const parsed = cancellationPolicySchema.parse({
      services: { daycare: { enabled: true } },
    });
    expect(parsed.services.daycare.customerMayCancel).toBe("instant");
  });

  test("an unknown service key is kept — custom modules have slugs", () => {
    const parsed = cancellationPolicySchema.parse({
      services: { "mobile-spa": { enabled: true } },
    });
    expect(parsed.services["mobile-spa"].enabled).toBe(true);
  });
});

describe("seeding from what the facility already set", () => {
  const SERVICES = ["boarding", "daycare", "grooming", "training"];

  test("the old flat rule becomes two tiers, free above the window", () => {
    const seeded = seedFromExisting({
      cancelPolicyHours: 48,
      cancelFeePercentage: 50,
      services: SERVICES,
    });
    const boarding = seeded.services.boarding;
    expect(resolveTier(boarding.tiers, 72)?.charge).toEqual({ kind: "none" });
    expect(resolveTier(boarding.tiers, 12)?.charge).toEqual({
      kind: "percentage",
      value: 50,
    });
  });

  test("it is OFF until somebody saves it", () => {
    // The seed is editor-only. Writing a policy nobody authored is how a
    // fixture's numbers reach a real invoice.
    const seeded = seedFromExisting({
      cancelPolicyHours: 48,
      cancelFeePercentage: 50,
      services: SERVICES,
    });
    for (const service of SERVICES) {
      expect(seeded.services[service].enabled).toBe(false);
      expect(policyDecidesAnything(seeded.services[service])).toBe(false);
    }
  });

  test("the deposit refund policy decides where the money goes back", () => {
    const credit = seedFromExisting({
      cancelPolicyHours: 24,
      cancelFeePercentage: 25,
      refundType: "credit",
      services: ["boarding"],
    });
    expect(resolveTier(credit.services.boarding.tiers, 1)?.refund).toBe(
      "store_credit",
    );

    const none = seedFromExisting({
      cancelPolicyHours: 24,
      cancelFeePercentage: 25,
      refundType: "non_refundable",
      services: ["boarding"],
    });
    expect(resolveTier(none.services.boarding.tiers, 1)?.refund).toBe("none");
  });

  test("a facility that set no fee seeds a policy that charges nothing", () => {
    const seeded = seedFromExisting({ services: ["grooming"] });
    expect(resolveTier(seeded.services.grooming.tiers, 0)?.charge).toEqual({
      kind: "none",
    });
  });

  test("what it seeds round-trips through the schema", () => {
    // The editor hands this straight to the save path, so it has to parse.
    const seeded = seedFromExisting({
      cancelPolicyHours: 48,
      cancelFeePercentage: 50,
      refundType: "credit",
      services: SERVICES,
    });
    expect(() => cancellationPolicySchema.parse(seeded)).not.toThrow();
  });
});

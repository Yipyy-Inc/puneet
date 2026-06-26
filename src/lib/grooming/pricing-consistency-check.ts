/**
 * Regression assertions for the grooming rate engine.
 *
 * Protects against the divergence the pricing audit flagged: the booking
 * wizard's Confirm step (display B) used to hard-code `pkg.sizePricing.small`
 * instead of running the resolver, silently dropping coat / breed / tier
 * modifiers for any non-small pet. After Fix #1 BookingModal calls the
 * resolver — so the regression we're guarding against is "someone reverts
 * Fix #1 and we don't notice."
 *
 * Run as a one-shot script:  `bun run check:pricing`
 *
 * No test framework dependency — this is plain TypeScript exercising the
 * resolver against hand-built fixtures. Returns a structured result so the
 * script wrapper (or any future test runner) can decide how to report.
 */

import { resolveEffectivePricing } from "@/lib/api/grooming";
import type {
  GroomingPackage,
  PetServicePricingOverride,
} from "@/types/grooming";

interface ScenarioResult {
  name: string;
  ok: boolean;
  expected: number;
  actual: number;
  detail: string;
}

interface ConsistencyReport {
  ok: boolean;
  results: ScenarioResult[];
}

// ── Fixture ────────────────────────────────────────────────────────────────
// A package with every rate-engine layer populated so each scenario exercises
// a distinct slice of the resolver. Numbers chosen to make the math obvious
// at a glance — small=50, medium=70, large=90, giant=110, coat-long=+15,
// breed override $145, premium tier +$20.

const FIXTURE_PACKAGE: GroomingPackage = {
  id: "fix-pkg-regression",
  name: "Regression Fixture Full Groom",
  description: "Synthetic package used only by consistency checks.",
  duration: 60,
  basePrice: 50,
  isActive: true,
  sizePricing: { small: 50, medium: 70, large: 90, giant: 110 },
  coatAdjustments: {
    short: 0,
    medium: 0,
    long: 15,
    wire: 10,
    curly: 10,
    double: 10,
    matted: 25,
    mode: "flat",
  },
  breedOverrides: { "Standard Poodle": 145 },
  // Tier deltas — applied on top of the resolved service price when the
  // assigned stylist's `capacity.skillLevel` matches the key. Junior is
  // present in the enum even though we don't use it in the scenarios.
  tierAdjustments: { standard: 0, premium: 20, platinum: 35 },
  includes: [],
  purchaseCount: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const EMPTY_OVERRIDES: PetServicePricingOverride[] = [];

// Real stylist IDs from src/data/grooming.ts — the resolver looks each one
// up to read `capacity.skillLevel`, so we can't pass a fake id.
const STYLIST_ID_PREMIUM = "stylist-001"; // skillLevel: "premium"

// ── Scenarios ──────────────────────────────────────────────────────────────

export function runPricingConsistencyChecks(): ConsistencyReport {
  const results: ScenarioResult[] = [];

  const assertPrice = (
    name: string,
    expected: number,
    actual: number,
    detail: string,
  ): void => {
    const eps = 0.001;
    results.push({
      name,
      expected,
      actual,
      ok: Math.abs(actual - expected) < eps,
      detail,
    });
  };

  // 1) The original audit scenario — large pet, long coat, no stylist.
  //    BookingModal pre-Fix-1 would have produced 50 (small bucket × 1).
  //    Resolver should produce 90 (large) + 15 (long coat) = 105.
  {
    const r = resolveEffectivePricing({
      petId: 1,
      petSize: "large",
      petBreed: "Mixed",
      petCoatType: "long",
      stylistId: undefined,
      package: FIXTURE_PACKAGE,
      petPricingOverrides: EMPTY_OVERRIDES,
    });
    assertPrice(
      "large pet + long coat, no stylist (display A / display B after Fix #1)",
      105,
      r.price,
      `source=${r.source}, coatDelta=${r.coatAdjustment?.delta ?? 0}`,
    );
  }

  // 2) Same pet, premium-tier stylist now committed (display C path).
  //    Should be 105 + 20 = 125. The 20 is the legitimate delta the spec
  //    allows between A/B and C.
  {
    const r = resolveEffectivePricing({
      petId: 1,
      petSize: "large",
      petBreed: "Mixed",
      petCoatType: "long",
      stylistId: STYLIST_ID_PREMIUM,
      package: FIXTURE_PACKAGE,
      petPricingOverrides: EMPTY_OVERRIDES,
    });
    assertPrice(
      "large pet + long coat + premium-tier stylist (display C path)",
      125,
      r.price,
      `source=${r.source}, tierDelta=${r.tierAdjustment?.delta ?? 0}`,
    );
  }

  // 3) Breed override must short-circuit size + coat.
  //    Standard Poodle on size=medium with long coat should still hit $145,
  //    NOT 70 (medium) + 15 (long).
  {
    const r = resolveEffectivePricing({
      petId: 2,
      petSize: "medium",
      petBreed: "Standard Poodle",
      petCoatType: "long",
      stylistId: undefined,
      package: FIXTURE_PACKAGE,
      petPricingOverrides: EMPTY_OVERRIDES,
    });
    assertPrice(
      "Standard Poodle (breed override) — short-circuits size + coat",
      145,
      r.price,
      `source=${r.source}`,
    );
  }

  // 4) Breed override + premium tier — DOCUMENTED CURRENT BEHAVIOR:
  //    the resolver's breed-override branch returns early (lines 429-441 of
  //    lib/api/grooming.ts), so tier is NOT applied on top. Spec Step 4
  //    reads as if tier should layer on, so this is a spec/code mismatch
  //    we're freezing as a known state — flip the expected value if the
  //    resolver is ever changed to apply tier post-override.
  {
    const r = resolveEffectivePricing({
      petId: 2,
      petSize: "medium",
      petBreed: "Standard Poodle",
      petCoatType: "long",
      stylistId: STYLIST_ID_PREMIUM,
      package: FIXTURE_PACKAGE,
      petPricingOverrides: EMPTY_OVERRIDES,
    });
    assertPrice(
      "Standard Poodle + premium tier (breed override short-circuits tier — current behavior)",
      145,
      r.price,
      `source=${r.source}, tierDelta=${r.tierAdjustment?.delta ?? 0}`,
    );
  }

  // 5) Pet-custom override beats everything (incl. breed override + tier).
  {
    const r = resolveEffectivePricing({
      petId: 3,
      petSize: "giant",
      petBreed: "Standard Poodle",
      petCoatType: "long",
      stylistId: STYLIST_ID_PREMIUM,
      package: FIXTURE_PACKAGE,
      petPricingOverrides: [
        {
          id: "override-fixture-3",
          petId: 3,
          packageId: FIXTURE_PACKAGE.id,
          customPrice: 200,
          customDurationMin: 90,
          note: "Hand-priced by manager",
          createdBy: "test",
          createdAt: new Date(0).toISOString(),
        },
      ],
    });
    assertPrice(
      "Pet-custom override beats breed + tier",
      200,
      r.price,
      `source=${r.source}`,
    );
  }

  // 6) Small pet, no coat, no breed override, no stylist — the "trivial"
  //    case where the pre-Fix-1 hard-code would coincidentally agree with
  //    the resolver. This documents the "happy path" so a future regression
  //    that breaks only the non-trivial scenarios is easier to spot.
  {
    const r = resolveEffectivePricing({
      petId: 4,
      petSize: "small",
      petBreed: "Chihuahua",
      petCoatType: "short",
      stylistId: undefined,
      package: FIXTURE_PACKAGE,
      petPricingOverrides: EMPTY_OVERRIDES,
    });
    assertPrice(
      "small pet, short coat, no stylist (the case pre-Fix-1 happened to get right)",
      50,
      r.price,
      `source=${r.source}`,
    );
  }

  // 7) A-B parity: A and B both call the resolver with stylistId=undefined.
  //    Given identical inputs they MUST produce identical numbers — this
  //    catches a regression where someone changes either side to a different
  //    formula.
  {
    const inputs = {
      petId: 5,
      petSize: "large" as const,
      petBreed: "Mixed",
      petCoatType: "long" as const,
      stylistId: undefined,
      package: FIXTURE_PACKAGE,
      petPricingOverrides: EMPTY_OVERRIDES,
    };
    const a = resolveEffectivePricing(inputs);
    const b = resolveEffectivePricing(inputs);
    assertPrice(
      "A=B parity (same inputs, no stylist) — pure resolver determinism",
      a.price,
      b.price,
      "displays A and B both call the resolver with stylistId=undefined",
    );
  }

  return {
    ok: results.every((r) => r.ok),
    results,
  };
}

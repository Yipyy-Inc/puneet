/**
 * Retail pricing math — the single source of truth for how a selling price is
 * derived from cost + margin, and how profit/margin are reported back.
 *
 * Used by the product form (live "computed price" preview), brand pricing rules,
 * invoice import (auto-fill selling price), and PO recalculation. Keeping the
 * math here means the number never drifts between those four surfaces.
 *
 * Spec tasks #2, #4, #13 (Section 1.2). Pure functions only — no I/O, no state.
 */

export type RoundingRule =
  | "none"
  | "nearest_0.05"
  | "nearest_0.10"
  | "nearest_0.25"
  | "nearest_0.50"
  | "up_whole_dollar";

/** Round to 2 decimal places, correcting the usual binary-float drift. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Snap a value to a rounding rule. Applied AFTER the raw price is rounded to
 * 2dp, so "none" is a passthrough.
 */
export function applyRounding(value: number, rule: RoundingRule): number {
  if (!Number.isFinite(value)) return 0;
  switch (rule) {
    case "none":
      return round2(value);
    case "up_whole_dollar":
      return Math.ceil(value);
    case "nearest_0.05":
      return round2(Math.round(value / 0.05) * 0.05);
    case "nearest_0.10":
      return round2(Math.round(value / 0.1) * 0.1);
    case "nearest_0.25":
      return round2(Math.round(value / 0.25) * 0.25);
    case "nearest_0.50":
      return round2(Math.round(value / 0.5) * 0.5);
    default:
      return round2(value);
  }
}

/**
 * Is a (cost, margin) pair usable? A margin of 100%+ divides by zero/negative,
 * and a non-positive cost has no meaningful markup — both are flagged so the UI
 * can show "invalid margin" instead of a nonsense price.
 */
export function isMarginValid(cost: number, marginPercent: number): boolean {
  return (
    Number.isFinite(cost) &&
    Number.isFinite(marginPercent) &&
    cost > 0 &&
    marginPercent < 100
  );
}

/**
 * Selling price from cost + margin: cost / (1 - margin/100), rounded to 2dp then
 * snapped to the rounding rule. On an invalid margin returns a safe non-negative
 * fallback (the cost itself, i.e. break-even) so callers never surface NaN.
 * Use {@link marginPricing} when you also need the invalid flag.
 */
export function sellingFromMargin(
  cost: number,
  marginPercent: number,
  rounding: RoundingRule = "none",
): number {
  if (!isMarginValid(cost, marginPercent)) {
    return cost > 0 ? round2(cost) : 0;
  }
  const raw = cost / (1 - marginPercent / 100);
  return applyRounding(round2(raw), rounding);
}

/**
 * Selling price plus the validity flag, for the product-form preview and
 * invoice import which both need to warn the user on a bad margin.
 */
export function marginPricing(
  cost: number,
  marginPercent: number,
  rounding: RoundingRule = "none",
): { selling: number; invalidMargin: boolean } {
  const invalidMargin = !isMarginValid(cost, marginPercent);
  return {
    selling: sellingFromMargin(cost, marginPercent, rounding),
    invalidMargin,
  };
}

/** Absolute profit per unit. */
export function profitOf(selling: number, cost: number): number {
  return round2(selling - cost);
}

/** Margin as a percentage of the selling price (0 when selling is non-positive). */
export function marginOf(selling: number, cost: number): number {
  return selling > 0 ? ((selling - cost) / selling) * 100 : 0;
}

/**
 * Recompute a product's selling price after its cost changes — the shared
 * recalc used by the PO-receive cost update (spec 1.11) and the invoice-import
 * apply (Step 4). Kept pure: the caller resolves the brand-rule margin and
 * passes it in.
 *
 * - margin → derived from `marginPercent`
 * - brand_rule → derived from `brandRuleMargin` (else keep `fallbackPrice`)
 * - manual → `fallbackPrice` (selling is never derived from cost)
 */
export function recomputeSellingPrice(input: {
  cost: number;
  method: "manual" | "margin" | "brand_rule";
  marginPercent?: number;
  /** Resolved brand-rule margin %, if the product's brand has a rule. */
  brandRuleMargin?: number;
  /** Fallback for manual / no-rule (typically the current selling price). */
  fallbackPrice: number;
  rounding: RoundingRule;
}): number {
  const {
    cost,
    method,
    marginPercent,
    brandRuleMargin,
    fallbackPrice,
    rounding,
  } = input;
  if (method === "margin") {
    return sellingFromMargin(cost, marginPercent ?? 0, rounding);
  }
  if (method === "brand_rule") {
    return brandRuleMargin != null
      ? sellingFromMargin(cost, brandRuleMargin, rounding)
      : fallbackPrice;
  }
  return fallbackPrice; // manual
}

// ---------------------------------------------------------------------------
// Inline assertions — the spec's worked examples (Section 1.2). These run once
// in dev only and log loudly if the math ever drifts; they never throw in prod.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV !== "production") {
  const cases: Array<[number, number, number]> = [
    [10, 50, 20.0],
    [10, 30, 14.29],
    [35, 40, 58.33],
    [50, 45, 90.91],
    [0.83, 70, 2.77],
  ];
  for (const [cost, margin, expected] of cases) {
    const got = sellingFromMargin(cost, margin, "none");
    console.assert(
      got === expected,
      `retail-pricing: sellingFromMargin(${cost}, ${margin}) = ${got}, expected ${expected}`,
    );
  }
  // Guard cases return a safe, non-negative fallback and flag the margin.
  console.assert(
    marginPricing(10, 100, "none").invalidMargin &&
      marginPricing(10, 100, "none").selling === 10,
    "retail-pricing: margin >= 100 must be flagged invalid with cost fallback",
  );
  console.assert(
    marginPricing(0, 40, "none").invalidMargin &&
      marginPricing(0, 40, "none").selling === 0,
    "retail-pricing: cost <= 0 must be flagged invalid with 0 fallback",
  );
}

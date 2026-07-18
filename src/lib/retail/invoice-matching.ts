/**
 * Invoice line → product matching (spec 2.9). Fuzzy-matches an OCR'd invoice
 * line description against the facility catalog on product NAME, BRAND, and SKU,
 * and returns a confidence-bucketed suggestion.
 *
 * Runs entirely on Yipyy's side against retailQueries.products() — NOT inside
 * the OCR service. Every result is a SUGGESTION; nothing is committed until the
 * Step 4 apply. Below 60% confidence the line is Unmatched (→ treated as a New
 * Product) rather than surfacing a wrong guess.
 *
 * No new dependency — a tiny local Levenshtein + token-recall similarity.
 */

import type { Product, ProductVariant } from "@/types/retail";

export type MatchBucket = "high" | "medium" | "unmatched";

export interface LineMatchResult {
  /** Best-guess product; omitted when Unmatched (confidence < 60). */
  product?: Product;
  /** 0–100. */
  confidence: number;
  bucket: MatchBucket;
}

/** Confidence floors (percent). */
export const HIGH_CONFIDENCE = 85;
export const MEDIUM_CONFIDENCE = 60;

// ── Similarity helpers (local, no dep) ──────────────────────────────────────

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const n = normalize(value);
  return n ? n.split(" ") : [];
}

/** Levenshtein edit distance. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Levenshtein similarity ratio, 0–1. */
function levRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/** Do two tokens match (exact or a close typo)? */
function tokenMatches(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  return levRatio(a, b) >= 0.82;
}

/**
 * Fraction of `target` tokens present in `source` (fuzzy) — a containment-style
 * recall, so a product name found inside a noisy invoice line scores high even
 * when the line has extra tokens (quantities, prices, etc.).
 */
function tokenRecall(target: string, source: string[]): number {
  const targetTokens = tokenize(target);
  if (targetTokens.length === 0) return 0;
  let hits = 0;
  for (const t of targetTokens) {
    if (source.some((s) => tokenMatches(t, s))) hits += 1;
  }
  return hits / targetTokens.length;
}

// ── Matcher ─────────────────────────────────────────────────────────────────

function bucketFor(confidence: number): MatchBucket {
  if (confidence >= HIGH_CONFIDENCE) return "high";
  if (confidence >= MEDIUM_CONFIDENCE) return "medium";
  return "unmatched";
}

/** Normalized SKUs for a product (own + variants) worth matching against. */
function skusFor(product: Product): string[] {
  const out = [product.sku];
  if (product.hasVariants) {
    for (const v of product.variants as ProductVariant[]) out.push(v.sku);
  }
  return out.map(normalize).filter((s) => s.length >= 4);
}

/** Score one product against the invoice line (0–1). */
function scoreProduct(
  descNorm: string,
  descTokens: string[],
  product: Product,
): number {
  // Name similarity — max of token recall (containment) and whole-string ratio.
  const nameScore = Math.max(
    tokenRecall(product.name, descTokens),
    levRatio(descNorm, normalize(product.name)),
  );

  // Brand presence is a small corroborating boost, not a match on its own.
  const brandTokens = tokenize(product.brand);
  const brandPresent =
    brandTokens.length > 0 &&
    brandTokens.every((t) => descTokens.some((s) => tokenMatches(t, s)));

  let score = brandPresent ? Math.min(1, nameScore + 0.1) : nameScore;

  // An SKU/code appearing verbatim in the line is a near-certain match.
  if (skusFor(product).some((sku) => descNorm.includes(sku))) {
    score = Math.max(score, 0.97);
  }
  return score;
}

/**
 * Best product match for an invoice line description, bucketed by confidence.
 * Returns Unmatched (no product) below 60%.
 */
export function matchLineToProduct(
  description: string,
  products: Product[],
): LineMatchResult {
  const descNorm = normalize(description);
  if (!descNorm) return { confidence: 0, bucket: "unmatched" };

  const descTokens = descNorm.split(" ");
  let best: Product | undefined;
  let bestScore = 0;

  for (const product of products) {
    if (!product.name.trim()) continue;
    const score = scoreProduct(descNorm, descTokens, product);
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }

  const confidence = Math.round(bestScore * 100);
  const bucket = bucketFor(confidence);
  return bucket === "unmatched"
    ? { confidence, bucket }
    : { product: best, confidence, bucket };
}

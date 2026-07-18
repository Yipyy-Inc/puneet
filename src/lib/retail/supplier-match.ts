/**
 * Fuzzy supplier-name matching for invoice import (spec 2.4). Matches an
 * OCR'd supplier name against the existing suppliers list, tolerant of spacing,
 * punctuation, casing, and common suffixes ("Inc.", "Co.") so "Pet Supply
 * Wholesale Co." resolves to "PetSupply Wholesale".
 */

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(inc|co|corp|corporation|ltd|llc|company)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function bigrams(value: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < value.length - 1; i++) out.push(value.slice(i, i + 2));
  return out;
}

/** Sørensen–Dice similarity of two names, 0–1. */
export function nameSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.length === 0 || bb.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const g of ba) counts.set(g, (counts.get(g) ?? 0) + 1);

  let overlap = 0;
  for (const g of bb) {
    const c = counts.get(g);
    if (c) {
      overlap += 1;
      counts.set(g, c - 1);
    }
  }
  return (2 * overlap) / (ba.length + bb.length);
}

/** Minimum similarity to treat two names as the same supplier. */
export const SUPPLIER_MATCH_THRESHOLD = 0.5;

/**
 * Best fuzzy match for `name` among `candidates`, or null if none clears the
 * threshold. Generic over any `{ id, name }` so it works with the Supplier type.
 */
export function matchSupplierByName<T extends { name: string }>(
  name: string | undefined,
  candidates: T[],
): { supplier: T; score: number } | null {
  if (!name?.trim()) return null;
  let best: T | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const score = nameSimilarity(name, candidate.name);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best && bestScore >= SUPPLIER_MATCH_THRESHOLD
    ? { supplier: best, score: bestScore }
    : null;
}

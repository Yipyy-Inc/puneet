/**
 * Personal referral-code generation: a readable `[FIRSTNAME]-[RANDOM4]` code,
 * uppercase with no special characters, unique within a facility.
 *
 * Pure except for the injectable `rng` (defaults to Math.random) so it can be
 * unit-tested deterministically. Runs at the data layer / event handlers — never
 * in component render (Math.random would violate the React Compiler purity rule
 * there).
 */

// Suffix alphabet excludes ambiguous glyphs (I, O, 0, 1) for readability.
const SUFFIX_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** First name → an uppercase alphanumeric token. Falls back to "FRIEND". */
export function referralCodeName(fullName: string | null | undefined): string {
  const first = (fullName ?? "").trim().split(/\s+/)[0] ?? "";
  const cleaned = first.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned || "FRIEND";
}

/** A random uppercase alphanumeric suffix of `length` characters. */
export function randomReferralSuffix(
  length = 4,
  rng: () => number = Math.random,
): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SUFFIX_ALPHABET[Math.floor(rng() * SUFFIX_ALPHABET.length)];
  }
  return out;
}

/**
 * Generate a `[FIRSTNAME]-[RANDOM4]` code not present in `existingCodes`
 * (compared case-insensitively). Retries the random suffix up to `maxAttempts`
 * times; the astronomically-unlikely all-collision case falls back to an
 * incrementing numeric suffix so the function always terminates.
 */
export function generateReferralCode(input: {
  fullName: string | null | undefined;
  existingCodes: Iterable<string>;
  suffixLength?: number;
  maxAttempts?: number;
  rng?: () => number;
}): string {
  const base = referralCodeName(input.fullName);
  const taken = new Set([...input.existingCodes].map((c) => c.toUpperCase()));
  const rng = input.rng ?? Math.random;
  const len = input.suffixLength ?? 4;
  const maxAttempts = input.maxAttempts ?? 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = `${base}-${randomReferralSuffix(len, rng)}`;
    if (!taken.has(code.toUpperCase())) return code;
  }

  // Deterministic last resort — guaranteed to find a free slot.
  for (let i = 1; ; i++) {
    const code = `${base}-${i}`;
    if (!taken.has(code.toUpperCase())) return code;
  }
}

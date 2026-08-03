import "server-only";

import { randomBytes, createHash } from "node:crypto";

// ============================================================================
// The invitation token.
//
// Minted here, hashed here, and stored ONLY as its hash (20260803180000). The
// plaintext is returned to the caller once — to be put in an email — and never
// written down. A leaked database dump therefore yields hashes rather than live
// onboarding links, which matters because these links authorise handing over an
// IBAN and a signed contract.
//
// 32 bytes from the CSPRNG, base64url. Not `Math.random().toString(36)`, which
// is what the mock store used (staff-onboarding.ts::generateToken): predictable
// output from a non-cryptographic generator seeded by a timestamp, in a string
// whose whole job is being unguessable.
// ============================================================================

export function mintOnboardingToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashOnboardingToken(token) };
}

/** Must agree with private.hash_onboarding_token — sha256 of the raw token. */
export function hashOnboardingToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

/** Postgres wants a hex-escape literal for a bytea sent over PostgREST. */
export function toByteaLiteral(hash: Buffer): string {
  return String.raw`\x` + hash.toString("hex");
}

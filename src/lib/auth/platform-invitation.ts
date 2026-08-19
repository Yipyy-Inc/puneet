import "server-only";

import {
  mintOnboardingToken,
  hashOnboardingToken,
  toByteaLiteral,
} from "@/lib/api/onboarding-token";

// ============================================================================
// Inviting somebody onto the Yipyy platform team.
//
// ── WHAT THIS REPLACED ────────────────────────────────────────────────────
//
// `src/lib/invitation-token.ts`, which built the whole invitation as plain
// base64url JSON:
//
//   { id, name, email, role, department, issuedAt, expiresAt, nonce }
//
// base64url is an ENCODING, not a signature. Anyone holding a link could
// decode it, change `role` to whatever they liked, re-encode, and open
// /setup/<their own token> — and the setup page believed the payload, because
// the payload was the only thing there was to believe.
//
// ── WHY OPAQUE RATHER THAN SIGNED ─────────────────────────────────────────
//
// Signing the old blob would have fixed the tampering and nothing else. An
// opaque token fixes the class:
//
//   * there is no payload, so there is nothing to tamper WITH — the role is
//     read from the `platform_invitations` row, not from the URL;
//   * only the sha256 is stored, so a database dump yields hashes rather than
//     live invitation links;
//   * expiry, revocation and single-use become columns, which is where they can
//     actually be enforced, rather than claims inside the thing being checked.
//
// The scheme is deliberately the same one the staff onboarding link already
// uses, and the helpers are imported rather than reimplemented — the hash has
// to agree with what the SQL side compares against, and two copies of "sha256
// of the raw token" is one copy too many.
// ============================================================================

export const PLATFORM_INVITE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export { toByteaLiteral };

export function mintPlatformInviteToken(): { token: string; hash: Buffer } {
  return mintOnboardingToken();
}

export function hashPlatformInviteToken(token: string): Buffer {
  return hashOnboardingToken(token);
}

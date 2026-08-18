import "server-only";

import {
  mintOnboardingToken,
  hashOnboardingToken,
  toByteaLiteral,
} from "@/lib/api/onboarding-token";
import type { AdminRole } from "@/data/admin-users";

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

/** Mirrors public.platform_role. */
export type PlatformRole = "superadmin" | "support" | "billing" | "readonly";

const PLATFORM_ROLES = new Set<string>([
  "superadmin",
  "support",
  "billing",
  "readonly",
]);

/**
 * The admin console's five job-flavoured labels, mapped onto the four real
 * platform roles.
 *
 * `AdminRole` is one of the four dead role vocabularies ADR 0005 names: it has
 * no Postgres counterpart and never did, because the screen it belongs to reads
 * a fixture. This mapping is what lets that screen keep its labels while the
 * invitation it sends records something the database can act on.
 *
 * Conservative by construction — anything unrecognised becomes `readonly`,
 * which is the role that can look and not touch. The alternative, defaulting to
 * the caller's intent, is how an unfamiliar label becomes an accidental
 * superadmin.
 */
const ADMIN_ROLE_TO_PLATFORM_ROLE: Record<AdminRole, PlatformRole> = {
  system_administrator: "superadmin",
  technical_support: "support",
  account_manager: "support",
  financial_auditor: "billing",
  sales_team: "readonly",
};

export function toPlatformRole(role: string | null | undefined): PlatformRole {
  if (!role) return "readonly";
  // A caller may name a real platform role directly; that is the honest path
  // and it is checked against the enum rather than trusted.
  if (PLATFORM_ROLES.has(role)) return role as PlatformRole;
  return ADMIN_ROLE_TO_PLATFORM_ROLE[role as AdminRole] ?? "readonly";
}

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  superadmin: "Superadmin — everything, including destructive and irreversible",
  support: "Support — help customers; read broadly, no destruction",
  billing: "Billing — the commercial surfaces",
  readonly: "Read only — look, do not touch",
};

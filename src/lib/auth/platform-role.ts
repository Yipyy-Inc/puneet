// ============================================================================
// The four platform roles, in one client-safe place.
//
// This lived in lib/auth/platform-invitation.ts, which is `server-only` because
// it mints and hashes invitation tokens. That was fine while only server routes
// needed the names — then the platform-roles screen and the invite dialog began
// showing them, and a client bundle cannot import a server-only module.
//
// TYPES were never the problem: `import type` is erased, so the screens could
// name PlatformRole all along. The moment a VALUE was needed — the label map —
// the build breaks, and `tsc --noEmit` does not notice, because `server-only`
// is a bundler guard rather than a type. Hence the split, and hence running
// `bun run build` for anything that moves a module across that line.
//
// Nothing here is a secret or a decision: it is the enum, its words, and the
// mapping that keeps an old client honest. The authority is still SQL —
// `invite_platform_admin` type-checks the role against `public.platform_role`
// and refuses anything else, whatever this file says.
// ============================================================================

/** Mirrors public.platform_role. */
export type PlatformRole = "superadmin" | "support" | "billing" | "readonly";

const PLATFORM_ROLES = new Set<string>([
  "superadmin",
  "support",
  "billing",
  "readonly",
]);

/**
 * The admin console's five old job-flavoured labels, mapped onto the four real
 * platform roles.
 *
 * The invite form no longer offers these — it offers `public.platform_role`
 * itself, so what a superadmin picks is what the membership records. This
 * survives because the route is a public HTTP surface and an old client, a
 * retried request or a saved integration may still name one of them, and
 * silently rejecting those would be a worse failure than mapping them.
 *
 * They are one of the four dead role vocabularies ADR 0005 names, so they are
 * spelled out here rather than imported from `src/data/admin-users.ts`: an
 * authorisation module should not depend on a fixture, and this list must not
 * grow if that one does.
 *
 * Conservative by construction — anything unrecognised becomes `readonly`,
 * which is the role that can look and not touch. The alternative, defaulting to
 * the caller's intent, is how an unfamiliar label becomes an accidental
 * superadmin.
 */
type LegacyConsoleRole =
  | "system_administrator"
  | "technical_support"
  | "account_manager"
  | "financial_auditor"
  | "sales_team";

const ADMIN_ROLE_TO_PLATFORM_ROLE: Record<LegacyConsoleRole, PlatformRole> = {
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
  return ADMIN_ROLE_TO_PLATFORM_ROLE[role as LegacyConsoleRole] ?? "readonly";
}

/**
 * The four roles, in words.
 *
 * Split into a name and a description, and derived into the combined form
 * below, because there were two hand-written copies of this — one here, one in
 * lib/api/platform-team.ts — and they had already drifted apart in punctuation.
 * `public.platform_role`'s own comments are the source for the descriptions.
 */
export const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = {
  superadmin: "Superadmin",
  support: "Support",
  billing: "Billing",
  readonly: "Read only",
};

export const PLATFORM_ROLE_BLURB: Record<PlatformRole, string> = {
  superadmin: "Everything, including destructive and irreversible actions",
  support: "Help customers — read broadly, no destruction",
  billing: "The commercial surfaces",
  readonly: "Look, do not touch",
};

/** Name and description in one line, for a sentence that needs both. */
export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  superadmin: `${PLATFORM_ROLE_LABEL.superadmin} — ${PLATFORM_ROLE_BLURB.superadmin}`,
  support: `${PLATFORM_ROLE_LABEL.support} — ${PLATFORM_ROLE_BLURB.support}`,
  billing: `${PLATFORM_ROLE_LABEL.billing} — ${PLATFORM_ROLE_BLURB.billing}`,
  readonly: `${PLATFORM_ROLE_LABEL.readonly} — ${PLATFORM_ROLE_BLURB.readonly}`,
};

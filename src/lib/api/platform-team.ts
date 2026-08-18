import type { PlatformTeamRow } from "@/app/api/admin/team/route";
import type { PlatformRole } from "@/lib/auth/platform-invitation";

// ============================================================================
// The platform team, from Postgres.
//
// A query factory in the shape CLAUDE.md asks for, so the screen consumes this
// rather than importing data directly. What it replaced —
// `useAdminTeam()` over a localStorage overlay on a five-person fixture — was
// not a query at all, which is why the screen could not tell a real invitation
// from an invented colleague.
// ============================================================================

export type { PlatformTeamRow };

export const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = {
  superadmin: "Superadmin",
  support: "Support",
  billing: "Billing",
  readonly: "Read only",
};

/**
 * What each role may do, in the words the database means them in.
 *
 * Deliberately short. `public.platform_role`'s own comments are the source, and
 * a longer description here would be a second definition to keep in step.
 */
export const PLATFORM_ROLE_BLURB: Record<PlatformRole, string> = {
  superadmin: "Everything, including destructive and irreversible actions",
  support: "Help customers — read broadly, no destruction",
  billing: "The commercial surfaces",
  readonly: "Look, do not touch",
};

async function readTeam(): Promise<PlatformTeamRow[]> {
  const response = await fetch("/api/admin/team");
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? "Could not read the platform team.");
  }
  const { team } = (await response.json()) as { team: PlatformTeamRow[] };
  return team;
}

export const platformTeamQueries = {
  all: () => ({
    queryKey: ["platform-team"] as const,
    queryFn: readTeam,
  }),
};

export async function revokePlatformInvitation(
  invitationId: string,
): Promise<void> {
  const response = await fetch(
    `/api/admin/team?invitationId=${encodeURIComponent(invitationId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? "Could not revoke that invitation.");
  }
}

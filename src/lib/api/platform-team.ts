import type { PlatformTeamRow } from "@/app/api/admin/team/route";

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

// The role labels are NOT re-exported from here. They live with the type in
// lib/auth/platform-role.ts, and a screen that needs both should take both from
// the one module — a re-export just hides which file is the definition.

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

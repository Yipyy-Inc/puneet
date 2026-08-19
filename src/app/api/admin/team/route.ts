import { NextRequest, NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import type { PlatformRole } from "@/lib/auth/platform-role";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Who is actually on the Yipyy platform team.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `src/data/admin-users.ts` — a fixture of five invented people — overlaid with
// `src/lib/admin-team-store.ts`, a localStorage store that added anybody
// invited at runtime and flipped their status on "setup complete". Once
// /api/admin/invite started writing a real `platform_invitations` row and
// /setup/<token> started creating a real identity, that roster became actively
// misleading: a real invitation appeared to do nothing, and a fixture row
// appeared to be a colleague.
//
// ── THE CALLER'S OWN CLIENT, NOT THE SERVICE KEY ──────────────────────────
//
// `platform_memberships_read` admits your own row or a platform admin;
// `platform_invitations_read` admits a platform admin; `profiles_read` admits a
// platform admin to every profile. So RLS already answers this question
// correctly, and reading as the caller means the guard below is a second lock
// rather than the only one.
//
// ── TWO SHAPES, ONE LIST ──────────────────────────────────────────────────
//
// A member has a profile and a membership. An invitation has neither — it is an
// address somebody was sent a link at. They are rendered in one table because
// that is the question being asked ("who is on the team, and who is on the way
// in"), but they are NOT the same row and the `kind` field says so: only an
// invitation can be revoked, and only a member has a profile id.
// ============================================================================

export interface PlatformTeamRow {
  kind: "member" | "invitation";
  /** profile id for a member, invitation id for a pending invite. */
  id: string;
  name: string | null;
  email: string;
  role: PlatformRole;
  status: "active" | "invited";
  /** When they joined (member) or when the invitation was sent. */
  since: string;
  /** Invitations only. */
  expiresAt: string | null;
  invitedByEmail: string | null;
}

export async function GET() {
  const viewer = await getViewer();
  if (viewer.source !== "session" || !viewer.isPlatformAdmin) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const supabase = await createServerClient();

  const [membersResult, invitesResult, profilesResult] = await Promise.all([
    supabase
      .from("platform_memberships")
      .select("profile_id, role, granted_by, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("platform_invitations")
      .select("id, email, full_name, role, invited_by, expires_at, created_at")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email, full_name"),
  ]);

  const error =
    membersResult.error ?? invitesResult.error ?? profilesResult.error;
  if (error) {
    console.error("[admin/team] read failed:", error);
    return NextResponse.json(
      { error: "Could not read the platform team." },
      { status: 500 },
    );
  }

  // One pass over profiles rather than a query per row. The table is small and
  // a platform admin may read all of it, so this is a join done in memory
  // instead of N round trips.
  const byId = new Map(
    (profilesResult.data ?? []).map((p) => [
      p.id as string,
      p as { id: string; email: string; full_name: string | null },
    ]),
  );

  const members: PlatformTeamRow[] = (membersResult.data ?? []).map((m) => {
    const profile = byId.get(m.profile_id as string);
    return {
      kind: "member",
      id: m.profile_id as string,
      name: profile?.full_name ?? null,
      // A membership whose profile is unreadable should not silently render as
      // a blank row — say which id it was.
      email: profile?.email ?? (m.profile_id as string),
      role: m.role as PlatformRole,
      status: "active",
      since: m.created_at as string,
      expiresAt: null,
      invitedByEmail: m.granted_by
        ? (byId.get(m.granted_by as string)?.email ?? null)
        : null,
    };
  });

  const invitations: PlatformTeamRow[] = (invitesResult.data ?? []).map(
    (i) => ({
      kind: "invitation",
      id: i.id as string,
      name: (i.full_name as string | null) ?? null,
      email: i.email as string,
      role: i.role as PlatformRole,
      status: "invited",
      since: i.created_at as string,
      expiresAt: i.expires_at as string,
      invitedByEmail: i.invited_by
        ? (byId.get(i.invited_by as string)?.email ?? null)
        : null,
    }),
  );

  // Pending first: an invitation is the row somebody needs to act on.
  return NextResponse.json({ team: [...invitations, ...members] });
}

/** Revoke a pending invitation. Superadmin-only, enforced in SQL. */
export async function DELETE(req: NextRequest) {
  const viewer = await getViewer();
  if (viewer.source !== "session" || !viewer.isPlatformAdmin) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  const invitationId = req.nextUrl.searchParams.get("invitationId")?.trim();
  if (!invitationId) {
    return NextResponse.json(
      { error: "invitationId is required." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();
  const { error } = await supabase.rpc("revoke_platform_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    // 42501 is the superadmin check in public.revoke_platform_invitation —
    // being on the team is not the same as being allowed to change who is.
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "42501" ? 403 : 400 },
    );
  }

  return NextResponse.json({ revoked: true });
}

import "server-only";

import { cookies } from "next/headers";

import type { FacilityStaffRole } from "@/types/facility-staff";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Who is asking — the one place a Server Component should ask.
//
// This exists because the app currently answers that question three
// incompatible ways, all of them client-writable: the `user_role` cookie
// (portal gate), the `facility_role` cookie (finer facility role), and
// `scheduling-current-user-role` in localStorage. Anyone can edit all three
// from devtools.
//
// The replacement is the signed JWT, whose app_metadata carries active
// memberships via private.custom_access_token_hook.
//
// CUTOVER: today's gates let an unauthenticated visitor into every portal —
// `undefined` role means "allow" (see facility/layout.tsx). Flipping that in one
// commit would lock out the team, the client's demos, and the Playwright suite
// at once. So:
//
//   AUTH_ENFORCED unset/false  session if there is one, else fall back to the
//                              legacy cookies — today's behaviour exactly
//   AUTH_ENFORCED=true         a session is required; no session means denied
//
// Flip it per environment (preview first), then delete the legacy branch and
// this flag once every portal has a working sign-in.
// ============================================================================

export type ViewerMembership = {
  membershipId: string;
  facilityId: string;
  role: FacilityStaffRole;
};

export type Viewer = {
  /** Where this identity came from — useful in logs while both paths exist. */
  source: "session" | "legacy-cookie" | "anonymous";
  userId: string | null;
  email: string | null;
  isPlatformAdmin: boolean;
  memberships: ViewerMembership[];
};

const ANONYMOUS: Viewer = {
  source: "anonymous",
  userId: null,
  email: null,
  isPlatformAdmin: false,
  memberships: [],
};

export function isAuthEnforced(): boolean {
  return process.env.AUTH_ENFORCED === "true";
}

/**
 * Claims are read from the verified JWT, not from the user record: the hook
 * injects memberships into the *token*, and `getUser()` returns stored
 * user metadata, which is a different (and user-editable) thing.
 */
function readMemberships(claims: unknown): ViewerMembership[] {
  const appMetadata = (claims as { app_metadata?: unknown } | null)
    ?.app_metadata;
  const raw = (appMetadata as { memberships?: unknown } | undefined)
    ?.memberships;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): ViewerMembership[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const { membership_id, facility_id, role } = entry as Record<
      string,
      unknown
    >;
    if (
      typeof membership_id !== "string" ||
      typeof facility_id !== "string" ||
      typeof role !== "string"
    ) {
      return [];
    }
    return [
      {
        membershipId: membership_id,
        facilityId: facility_id,
        role: role as FacilityStaffRole,
      },
    ];
  });
}

async function viewerFromSession(): Promise<Viewer | null> {
  let supabase: Awaited<ReturnType<typeof createServerClient>>;
  try {
    supabase = await createServerClient();
  } catch {
    // Supabase not configured in this environment — fall through to legacy.
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;
  const appMetadata = (claims as { app_metadata?: unknown } | null)
    ?.app_metadata;

  return {
    source: "session",
    userId: user.id,
    email: user.email ?? null,
    isPlatformAdmin:
      (appMetadata as { is_platform_admin?: unknown } | undefined)
        ?.is_platform_admin === true,
    memberships: readMemberships(claims),
  };
}

/**
 * The legacy path: today's `user_role` cookie, where an ABSENT value means
 * "allow everything" for local testing. Preserved verbatim so nothing changes
 * until AUTH_ENFORCED is switched on.
 */
async function viewerFromLegacyCookie(): Promise<Viewer> {
  const cookieStore = await cookies();
  const userRole = cookieStore.get("user_role")?.value;

  return {
    source: "legacy-cookie",
    userId: null,
    email: null,
    // Absent cookie historically defaulted to super_admin on /dashboard.
    isPlatformAdmin: userRole === undefined || userRole === "super_admin",
    memberships: [],
  };
}

export async function getViewer(): Promise<Viewer> {
  const fromSession = await viewerFromSession();
  if (fromSession) return fromSession;
  if (isAuthEnforced()) return ANONYMOUS;
  return viewerFromLegacyCookie();
}

/** True when the viewer holds any active membership at `facilityId`. */
export function belongsToFacility(viewer: Viewer, facilityId: string): boolean {
  return (
    viewer.isPlatformAdmin ||
    viewer.memberships.some((m) => m.facilityId === facilityId)
  );
}

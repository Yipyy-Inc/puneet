import "server-only";

import { auth } from "@clerk/nextjs/server";

import type { FacilityStaffRole } from "@/types/facility-staff";
import { createClerkServerClient } from "@/lib/supabase/clerk-server";

// ============================================================================
// Who is asking — the one place a Server Component should ask.
//
// The answer is a Clerk session for the subject, and the membership tables for
// what that subject may do. There is no other answer.
//
// It used to read `app_metadata.memberships` off the Supabase JWT, injected by
// private.custom_access_token_hook. That hook is only called when SUPABASE Auth
// mints a token, so a Clerk session never triggers it and the claim is simply
// absent — which is why this reads the tables instead.
//
// Two indexed queries per request rather than one claim read. That is the cost,
// and it buys correctness: a claim is a snapshot taken when the token was
// minted, so revoking a membership left the old one live until the token
// refreshed. A query sees the revocation immediately.
//
// It used to have three, all client-writable from devtools: the `user_role`
// cookie (portal gate), the `facility_role` cookie (finer facility role), and
// `scheduling-current-user-role` in localStorage. An absent `user_role` meant
// "allow", so an anonymous visitor was admitted to every portal.
//
// The cutover ran behind AUTH_ENFORCED, a per-portal flag, because turning six
// portals on at once is not a cutover but a coin flip. All four portals
// (`admin`, `facility`, `customer`, `staff`) have been enforced in production
// and verified there, so the flag and the legacy branch are gone: a portal now
// requires a session, full stop, and there is no configuration that can put the
// old behaviour back.
//
// WHAT THIS FILE IS NOT. The gates below are routing — they decide which UI you
// are sent to. They are not what keeps anyone out of the data; RLS does that, on
// the database, from the same JWT. Both matter, and the second one is the reason
// this deletion is safe rather than merely tidy.
//
// STILL TO GO: the `user_role` cookie itself survives, because portal switchers,
// UserProfileSheet, OperationsCalendar and SchedulingSettings still steer UI by
// it. Nothing about ACCESS depends on it any more, which is the part that
// mattered. Removing the rest is UI work, not auth work.
// ============================================================================

export type ViewerMembership = {
  membershipId: string;
  facilityId: string;
  role: FacilityStaffRole;
};

export type Viewer = {
  /**
   * Session or nothing.
   *
   * `source` is kept as a two-value field rather than collapsed into
   * `userId !== null` because the gates read better asking "is this a real
   * session" than "is there an id", and because it is what shows up in logs.
   * The third value, "legacy-cookie", is gone.
   */
  source: "session" | "anonymous";
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

async function viewerFromSession(): Promise<Viewer | null> {
  // Clerk owns the subject. `userId` here is the token's `sub` — the same value
  // RLS reads as auth.jwt()->>'sub', which is what makes the two queries below
  // return this person's rows and nobody else's.
  const { userId } = await auth();
  if (!userId) return null;

  let supabase: ReturnType<typeof createClerkServerClient>;
  try {
    supabase = createClerkServerClient();
  } catch {
    // Supabase not configured in this environment. There is no legacy path to
    // fall through to, so this resolves to anonymous and every portal refuses —
    // which is the correct answer to "we cannot verify anyone".
    return null;
  }

  // Both reads go through RLS as the caller, not around it. `profiles_read`
  // admits your own row and `memberships_read` your own memberships, so a
  // tampered id returns nothing rather than someone else's tenancy.
  const [profile, memberships] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, is_platform_admin")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("facility_memberships")
      .select("id, facility_id, role")
      .eq("profile_id", userId)
      .eq("is_active", true),
  ]);

  // A signed-in Clerk user with no profile row yet is a real state, not an
  // error: the sync webhook is asynchronous, so the first request after sign-up
  // can arrive first. They resolve to a session with no memberships, every
  // portal gate refuses, and the next request — once the webhook has landed —
  // resolves normally.
  return {
    source: "session",
    userId,
    email: profile.data?.email ?? null,
    isPlatformAdmin: profile.data?.is_platform_admin === true,
    memberships: (memberships.data ?? []).map((m) => ({
      membershipId: m.id,
      facilityId: m.facility_id,
      role: m.role as FacilityStaffRole,
    })),
  };
}

export async function getViewer(): Promise<Viewer> {
  return (await viewerFromSession()) ?? ANONYMOUS;
}

/** True when the viewer holds any active membership at `facilityId`. */
export function belongsToFacility(viewer: Viewer, facilityId: string): boolean {
  return (
    viewer.isPlatformAdmin ||
    viewer.memberships.some((m) => m.facilityId === facilityId)
  );
}

// ── Where a given identity belongs ──────────────────────────────────────────
// One sign-in serves every kind of account, so something has to decide which
// portal a person lands in. That decision is here rather than in the sign-in
// action so the gates and the action cannot disagree about it.

/** Roles that run the business and get the full facility admin portal. */
const FACILITY_ADMIN_ROLES = new Set<string>([
  "owner",
  "admin",
  "manager",
  "supervisor",
]);

export function landingPathForClaims(
  isPlatformAdmin: boolean,
  memberships: ViewerMembership[],
): string {
  if (isPlatformAdmin) return "/dashboard";

  // No membership means this is a pet owner, not staff.
  const primary = memberships[0];
  if (!primary) return "/customer/dashboard";

  if (memberships.some((m) => FACILITY_ADMIN_ROLES.has(m.role))) {
    return "/facility/dashboard";
  }
  if (primary.role === "groomer") return "/groomer/dashboard";

  // Everyone else on staff — caretakers, reception, trainers, retail — works
  // out of the employee schedule.
  return "/employee/schedule";
}

export function landingPathFor(viewer: Viewer): string {
  return landingPathForClaims(viewer.isPlatformAdmin, viewer.memberships);
}

// ── Portal gates ────────────────────────────────────────────────────────────
// One gate per portal, so the rule lives next to the identity rather than being
// re-derived from cookies in each layout.
//
// Each was two arms — the old cookie rule while AUTH_ENFORCED was off, the
// signed token once it was on. Only the token arm is left.
//
// WHAT A DENIED GATE ACTUALLY DOES — measured, not assumed.
// `redirect()` from these layouts is a SOFT redirect: because the layout
// streams, headers are already sent, so Next returns HTTP 200 with a
// NEXT_REDIRECT instruction in the RSC payload and the client router performs
// the navigation. Verified with curl: the response is a ~32KB shell containing
// the redirect and none of the portal's content, because the layout throws
// before its children render.
//
// So these gates are routing, not the security boundary. The boundary is RLS —
// a denied caller who ignores the redirect still gets zero rows, because the
// database filters on the JWT rather than on where the browser ended up. Do not
// let a future "just skip the gate for X" argument treat this as the last line
// of defence; it is the first.

/**
 * Facility portal. Any active membership admits you; platform admins are let
 * through so they can review facility and HQ features without swapping
 * identity — which is what the old cookie rule allowed too.
 */
export function canAccessFacilityPortal(viewer: Viewer): boolean {
  return (
    viewer.source === "session" &&
    (viewer.isPlatformAdmin || viewer.memberships.length > 0)
  );
}

/**
 * Platform super-admin portal. Nothing but the platform-admin flag.
 *
 * The `source === "session"` half is now redundant — `isPlatformAdmin` is only
 * ever true on a session — and it is kept anyway. It was load-bearing until this
 * commit: the legacy fallback set `isPlatformAdmin: true` when the `user_role`
 * cookie was ABSENT, so checking the flag alone admitted the exact anonymous
 * visitor this gate exists to stop. Keeping the check costs nothing and means
 * the gate does not depend on a claim being unforgeable somewhere else.
 */
export function canAccessAdminPortal(viewer: Viewer): boolean {
  return viewer.source === "session" && viewer.isPlatformAdmin;
}

/**
 * Customer portal. Any signed-in identity qualifies — a pet owner has no
 * membership by design, and staff are often customers of their own facility,
 * so requiring the ABSENCE of a membership would lock them out of their own
 * bookings.
 */
export function canAccessCustomerPortal(viewer: Viewer): boolean {
  return viewer.source === "session";
}

/**
 * Staff-facing portals: groomer, staff and employee. Any active membership,
 * whatever the role — these are the day-to-day work surfaces, and which one
 * you land on is decided by landingPathForClaims, not by who may enter.
 */
export function canAccessStaffPortal(viewer: Viewer): boolean {
  return (
    viewer.source === "session" &&
    (viewer.isPlatformAdmin || viewer.memberships.length > 0)
  );
}

/**
 * Coarse "can this person create records for the facility" check, used for
 * a couple of header affordances.
 *
 * This is a placeholder, and deliberately a shallow one: the real answer lives
 * in `private.resolve_permission`, which resolves a permission key through the
 * three-layer cascade (role preset → facility override → per-staff override)
 * to an access_scope rather than a boolean. Route this through that function
 * once the permission catalog is wired to the UI — do not grow this list.
 */
const MANAGING_ROLES = new Set(["owner", "admin", "manager"]);

export function canManageCustomers(viewer: Viewer): boolean {
  return viewer.memberships.some((m) => MANAGING_ROLES.has(m.role));
}

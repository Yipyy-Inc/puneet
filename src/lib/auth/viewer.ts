import "server-only";

import { cache } from "react";

import { withAuth } from "@workos-inc/authkit-nextjs";

import type {
  FacilityAccessLevel,
  FacilityStaffRole,
} from "@/types/facility-staff";
import { createWorkosServerClient } from "@/lib/supabase/workos-server";
import {
  IDENTITY_TTL_MS,
  identityCache,
  registerIdentityCache,
} from "@/lib/auth/identity-cache";

// ============================================================================
// Who is asking — the one place a Server Component should ask.
//
// The answer is a WorkOS session for the subject (ADR 0004), and the membership
// tables for what that subject may do. There is no other answer.
//
// The provider changed here and NOWHERE ELSE. `Viewer`, `getViewer()` and the
// gates below kept their names and signatures through two provider migrations,
// which is why ~70 call sites have never been edited for either of them.
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
// DONE: the `user_role` cookie no longer decides anything. The portal switchers
// are deleted, UserProfileSheet takes its identity and its account-menu gate
// from this file, SchedulingSettings asks the permission cascade, and
// /facility/set-role — a page whose two buttons wrote the cookie and offered
// "Set as Super Admin" — is gone. getUserRole/setUserRole no longer exist.
//
// OperationsCalendar was the last reader — of it, of its own
// `calendar_permission_level`, and of `user_name` / `user_id` for the actor it
// stamped on events. Since 2026-09-18 it takes the viewer and the permissions
// from the session (use-facility-rbac), and nothing reads any of them.
// ============================================================================

export type ViewerMembership = {
  membershipId: string;
  facilityId: string;
  /**
   * The JOB TITLE. Selects the permission template private.resolve_permission
   * reads — it does NOT decide which portal you get. See ADR 0005.
   */
  role: FacilityStaffRole;
  /** Which portal you get. The only thing the gates below read. */
  accessLevel: FacilityAccessLevel;
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
  /**
   * The person's own name, for anything that greets them.
   *
   * Null until the sync webhook has landed, exactly like `email` — a header
   * that falls back to the address is right, one that falls back to a literal
   * is how "Super Admin / admin@yipyy.com" ended up rendered above somebody
   * else's session.
   */
  fullName: string | null;
  isPlatformAdmin: boolean;
  memberships: ViewerMembership[];
};

const ANONYMOUS: Viewer = {
  source: "anonymous",
  userId: null,
  email: null,
  fullName: null,
  isPlatformAdmin: false,
  memberships: [],
};

/** One person's session, remembered for a few seconds — see identity-cache.ts. */
const viewers = registerIdentityCache(
  identityCache<{ viewer: Viewer; hasProfile: boolean }>(IDENTITY_TTL_MS),
);

async function viewerFromSession(): Promise<Viewer | null> {
  // WorkOS owns the subject. `user.id` here is the token's `sub` — the same
  // value RLS reads as auth.jwt()->>'sub', which is what makes the query
  // below return this person's rows and nobody else's. Verified against the live
  // environment before the swap: sub === user.id, and the token resolves in
  // Postgres as `authenticated` rather than `anon`.
  const { user, sessionId } = await withAuth();
  if (!user) return null;

  let supabase: ReturnType<typeof createWorkosServerClient>;
  try {
    supabase = createWorkosServerClient();
  } catch {
    // Supabase not configured in this environment. There is no legacy path to
    // fall through to, so this resolves to anonymous and every portal refuses —
    // which is the correct answer to "we cannot verify anyone".
    return null;
  }

  // The session is part of the key, so a new sign-in — a different person,
  // or the same one after a role change — always reads afresh. An answer
  // without a profile row is never kept: the sign-up webhook is on its way.
  const { viewer } = await viewers.get(
    `${user.id}|${sessionId ?? ""}`,
    () => readViewer(supabase, user),
    (read) => read.hasProfile,
  );
  return viewer;
}

async function readViewer(
  supabase: ReturnType<typeof createWorkosServerClient>,
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  },
): Promise<{ viewer: Viewer; hasProfile: boolean }> {
  const userId = user.id;

  // ONE read, the memberships embedded in the profile: they hang off it by
  // `facility_memberships.profile_id`, and a membership cannot exist without
  // the profile it references. Still through RLS as the caller, not around
  // it — `profiles_read` admits your own row and `memberships_read` your own
  // memberships, so a tampered id returns nothing rather than someone else's
  // tenancy.
  const { data: row } = await supabase
    .from("profiles")
    .select(
      "email, full_name, is_platform_admin, facility_memberships ( id, facility_id, role, access_level, is_active )",
    )
    .eq("id", userId)
    .maybeSingle();
  const profile = { data: row };
  const memberships = {
    data: (row?.facility_memberships ?? []).filter((m) => m.is_active),
  };

  // A signed-in user with no profile row yet is a real state, not an error: the
  // sync webhook is asynchronous, so the first request after sign-up can arrive
  // first. They resolve to a session with no memberships, every portal gate
  // refuses, and the next request — once the webhook has landed — resolves
  // normally.
  //
  // The session's own address is the fallback, which the Clerk version could not
  // do: it read the email only from `profiles`, so during that window the viewer
  // had a session and a null email. Now the profile wins when it exists and the
  // token answers when it does not.
  const viewer: Viewer = {
    source: "session",
    userId,
    email: profile.data?.email ?? user.email ?? null,
    // `||` and not `??` on the join: it returns "" when the token carries
    // neither name, and an empty string is a value — it would satisfy `??` and
    // render a blank where a name goes.
    fullName:
      profile.data?.full_name ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      null,
    isPlatformAdmin: profile.data?.is_platform_admin === true,
    memberships: (memberships.data ?? []).map((m) => ({
      membershipId: m.id,
      facilityId: m.facility_id,
      role: m.role as FacilityStaffRole,
      // Absent only if this build is ahead of the migration. Defaulting to
      // "staff" is the fail-closed answer — the same default the column has.
      accessLevel: (m.access_level ?? "staff") as FacilityAccessLevel,
    })),
  };
  return { viewer, hasProfile: Boolean(profile.data) };
}

/**
 * Who is asking — resolved ONCE per request.
 *
 * ── WHY `cache()` IS LOAD-BEARING, NOT AN OPTIMISATION ────────────────────
 *
 * Measured on the live project, 2026-09-17, one hour of edge logs:
 *
 *   /rest/v1/facility_memberships  13,004
 *   /rest/v1/profiles              12,975
 *   /rest/v1/facilities             7,634
 *   /rest/v1/locations              6,803
 *
 * — about 40,000 Supabase requests an hour whose entire job is answering "who
 * is this and which facility are they in", against 1,484 booking reads and 799
 * client reads in the same hour. Two thirds of ALL database traffic was the
 * auth chain, and `profiles` ran at roughly TWICE the rate of `facilities`
 * because nothing deduplicated it: `activeFacilityIdForStaff()` resolves the
 * viewer itself and then calls `getFacilityContext()`, which resolves it
 * again, and a route that also calls `getViewer()` directly makes three.
 *
 * That put the organisation 302% over a 5 GB egress quota and started a grace
 * period. It is not a latency footnote; it was the bill.
 *
 * React's `cache()` is request-scoped: every call inside one request returns
 * the same promise, and the next request starts clean. So this cannot serve one
 * person's identity to another — the cache lives and dies with the request, and
 * there is no key to get wrong.
 *
 * ── AND ACROSS REQUESTS, FOR A FEW SECONDS (2026-09-26) ───────────────────
 *
 * Once per request was not enough. A page load is ~37 requests, and each
 * still paid the whole chain: measured over one day, the four identity reads
 * were 73% of 1,040,161 API requests, and log ingestion stood at 16.8 of
 * 20 GB. So the profile and its memberships are ONE read now, and a
 * session's answer is kept for `IDENTITY_TTL_MS` behind a key of the person
 * AND the session (identity-cache.ts). Data access is untouched — RLS judges
 * every query as the caller — and the app's own identity writes call
 * `forgetIdentities()`; what can lag, by seconds, is only a portal gate.
 */
export const getViewer = cache(async function getViewer(): Promise<Viewer> {
  return (await viewerFromSession()) ?? ANONYMOUS;
});

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

/**
 * Does this person run the business at any facility?
 *
 * Reads `accessLevel`, never the job title. The hardcoded role set that used to
 * live here — owner/admin/manager/supervisor — is now the BACKFILL of
 * `facility_memberships.access_level`, so this answers identically for every
 * membership that exists today while letting a facility promote, say, its
 * receptionist without also handing them an owner's 168 permissions.
 *
 * The database enforces the same split from the other side:
 * private.is_facility_admin reads the same column, and a trigger stops anyone
 * but an existing admin from raising it.
 */
function isFacilityAdmin(memberships: ViewerMembership[]): boolean {
  return memberships.some((m) => m.accessLevel === "admin");
}

export function landingPathForClaims(
  isPlatformAdmin: boolean,
  memberships: ViewerMembership[],
): string {
  if (isPlatformAdmin) return "/dashboard";

  // No membership means this is a pet owner, not staff.
  const primary = memberships[0];
  if (!primary) return "/customer/dashboard";

  if (isFacilityAdmin(memberships)) {
    return "/facility/dashboard";
  }

  // Everyone else on staff — groomers, caretakers, reception, trainers, retail
  // — works out of the employee schedule. Groomers used to be singled out here
  // and sent to `/groomer/dashboard`; ADR 0005 retired that portal, and this is
  // what makes the branch dead before it is deleted. `primary` is still read
  // above to tell staff from pet owners.
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
 * Facility portal — the admin surface. ADR 0005 made this an ADMIN gate.
 *
 * It used to be byte-identical to canAccessStaffPortal: any active membership
 * admitted you, so a groomer who typed /facility got the whole business. Only
 * the LANDING PATH differed, which meant the admin/staff distinction was a
 * suggestion the app made and nothing enforced.
 *
 * Platform admins still pass — a super admin has to be able to see a facility
 * to support it (ADR 0005 §5).
 *
 * Still routing, not the boundary: RLS is what returns zero rows to a staff
 * member who ignores the redirect. The step that makes THIS gate load-bearing
 * is moving the admin-only tables onto private.is_facility_admin.
 */
export function canAccessFacilityPortal(viewer: Viewer): boolean {
  if (viewer.source !== "session") return false;
  return viewer.isPlatformAdmin || isFacilityAdmin(viewer.memberships);
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
 * The staff work surface: `/employee`. Any active membership, whatever the
 * role — it is one portal now (ADR 0005), permission-driven rather than
 * role-per-portal, so this gate no longer decides WHICH one you get.
 *
 * Stays permissive under the coming admin/staff split: a facility admin clocks
 * in and has a schedule like anybody else. admin ⊃ staff, one-directionally.
 */
export function canAccessStaffPortal(viewer: Viewer): boolean {
  return (
    viewer.source === "session" &&
    (viewer.isPlatformAdmin || viewer.memberships.length > 0)
  );
}

/**
 * May this person act on the facility's OWN account — its subscription, its
 * payment method, its data export, its Yipyy agreements?
 *
 * ── WHY THIS EXISTS, AND WHAT IT REPLACED ─────────────────────────────────
 *
 * `requireFacilityOwner()` used to answer this by reading the `facility_role`
 * COOKIE, through a helper whose rule was `role == null || role === "owner"`.
 * An ABSENT cookie meant yes. The cookie is written by `document.cookie` from
 * a client hook, so deleting it in devtools — or never having it — opened the
 * subscription, the payment method and a full data export to any member of any
 * facility. The layout above it states it "returns a 403 for any non-owner
 * role", which was not true, and a false assurance is worse than none because
 * the next feature is written on top of it.
 *
 * This reads the session instead: the same membership rows RLS decides with,
 * which no browser can edit.
 *
 * ── WHY A ROLE SET AND NOT A PERMISSION KEY ───────────────────────────────
 *
 * Cancelling the subscription is not a permission a facility should be able to
 * hand out through its own role editor — that would let a facility grant itself
 * authority over its own billing relationship. It is an access level, which is
 * exactly the distinction ADR 0005 draws.
 *
 * That access level has now landed, so this reads the column rather than the
 * role set it was written against. Same answer for every membership alive
 * today; a different, correct one the moment a facility promotes somebody whose
 * job title is not an admin-tier one.
 */
export function canManageFacilityAccount(viewer: Viewer): boolean {
  if (viewer.source !== "session") return false;
  // A platform admin has to be able to see a facility's billing to support it.
  if (viewer.isPlatformAdmin) return true;
  return isFacilityAdmin(viewer.memberships);
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

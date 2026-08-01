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
//   AUTH_ENFORCED=true         a session is required everywhere
//   AUTH_ENFORCED=admin        ...only for the platform portal
//   AUTH_ENFORCED=admin,staff  ...for a chosen set
//
// Per-portal because all-at-once is not a cutover, it is a coin flip. Six
// portals with different audiences fail differently, and turning them on
// together means debugging six unrelated problems in one sitting.
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
  /**
   * The `user_role` cookie, read on every path rather than only the legacy one.
   * The portal gates below need it to reproduce today's behaviour *exactly*
   * while AUTH_ENFORCED is off — including for someone who has signed in.
   * Deleted along with the flag.
   */
  legacyRole: string | null;
};

const ANONYMOUS: Omit<Viewer, "legacyRole"> = {
  source: "anonymous",
  userId: null,
  email: null,
  isPlatformAdmin: false,
  memberships: [],
};

/** The gated surfaces. `staff` covers the groomer, staff and employee portals. */
export type Portal = "admin" | "facility" | "customer" | "staff";

const ALL_PORTALS: Portal[] = ["admin", "facility", "customer", "staff"];

function enforcedPortals(): Set<Portal> {
  const raw = process.env.AUTH_ENFORCED?.trim();
  if (!raw || raw === "false") return new Set();
  if (raw === "true") return new Set(ALL_PORTALS);

  const named = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Portal => (ALL_PORTALS as string[]).includes(s));
  return new Set(named);
}

/**
 * With a portal: is that portal enforced? Without: is EVERY portal enforced —
 * which is the only condition under which the legacy identity fallback can be
 * dropped entirely.
 */
export function isAuthEnforced(portal?: Portal): boolean {
  const enforced = enforcedPortals();
  return portal ? enforced.has(portal) : enforced.size === ALL_PORTALS.length;
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

async function viewerFromSession(): Promise<Omit<Viewer, "legacyRole"> | null> {
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
function viewerFromLegacyCookie(
  legacyRole: string | null,
): Omit<Viewer, "legacyRole"> {
  return {
    source: "legacy-cookie",
    userId: null,
    email: null,
    // Absent cookie historically defaulted to super_admin on /dashboard.
    isPlatformAdmin: legacyRole === null || legacyRole === "super_admin",
    memberships: [],
  };
}

export async function getViewer(): Promise<Viewer> {
  const cookieStore = await cookies();
  const legacyRole = cookieStore.get("user_role")?.value ?? null;

  const fromSession = await viewerFromSession();
  if (fromSession) return { ...fromSession, legacyRole };
  if (isAuthEnforced()) return { ...ANONYMOUS, legacyRole };
  return { ...viewerFromLegacyCookie(legacyRole), legacyRole };
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
// Each has two arms. While AUTH_ENFORCED is off the answer is today's
// cookie rule, verbatim — signing in must not be able to lock anyone out of a
// portal mid-build. Once it is on, the answer comes from the signed token.
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

const LEGACY_FACILITY_ROLES = ["facility_admin", "super_admin"];

/**
 * Facility portal. Any active membership admits you; platform admins are let
 * through so they can review facility and HQ features without swapping
 * identity — which is what the old cookie rule allowed too.
 */
export function canAccessFacilityPortal(viewer: Viewer): boolean {
  if (!isAuthEnforced("facility")) {
    return (
      viewer.legacyRole === null ||
      LEGACY_FACILITY_ROLES.includes(viewer.legacyRole)
    );
  }
  return (
    viewer.source === "session" &&
    (viewer.isPlatformAdmin || viewer.memberships.length > 0)
  );
}

/**
 * Platform super-admin portal. Nothing but the platform-admin flag.
 *
 * `source === "session"` is not belt-and-braces, it is load-bearing. While any
 * portal is still unenforced, getViewer keeps returning the legacy fallback for
 * a visitor with no session — and that fallback sets `isPlatformAdmin: true`
 * when the `user_role` cookie is ABSENT, because that is what the old rule did.
 * Checking the flag alone would therefore admit the exact anonymous visitor
 * this gate exists to stop.
 */
export function canAccessAdminPortal(viewer: Viewer): boolean {
  if (!isAuthEnforced("admin")) return viewer.legacyRole !== "facility_admin";
  return viewer.source === "session" && viewer.isPlatformAdmin;
}

/**
 * Customer portal. Any signed-in identity qualifies — a pet owner has no
 * membership by design, and staff are often customers of their own facility,
 * so requiring the ABSENCE of a membership would lock them out of their own
 * bookings.
 */
export function canAccessCustomerPortal(viewer: Viewer): boolean {
  if (!isAuthEnforced("customer")) return true;
  return viewer.source === "session";
}

/**
 * Staff-facing portals: groomer, staff and employee. Any active membership,
 * whatever the role — these are the day-to-day work surfaces, and which one
 * you land on is decided by landingPathForClaims, not by who may enter.
 */
export function canAccessStaffPortal(viewer: Viewer): boolean {
  if (!isAuthEnforced("staff")) return true;
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
  if (!isAuthEnforced("facility")) {
    return viewer.legacyRole === "facility_admin";
  }
  return viewer.memberships.some((m) => MANAGING_ROLES.has(m.role));
}

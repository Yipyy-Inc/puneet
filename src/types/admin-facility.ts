// The shape the superadmin facilities list renders.
//
// Its own file, with no `server-only`, because the list is a client component
// and the builder (src/lib/api/admin-facilities.ts) is a server module. A type
// exported from the server module could not be imported by the screen that
// consumes it.
//
// The shape mirrors what that screen ALREADY rendered from mock data —
// `locationsList`, `usersList`, `clients`, `limits`. Not the shape I would
// design; changing it means rewriting 753 lines of filtering, sorting, columns
// and CSV export, which is the next change rather than this one.

export interface AdminFacilityRow {
  /** The uuid. The list treats it as opaque; nothing derives from it. */
  id: string;
  name: string;
  slug: string;
  /** What the status badge can express: active or not. */
  status: "active" | "inactive";
  /** The real subscription state, for anyone who needs the detail. */
  subscriptionStatus: string;
  plan: string;
  dayJoined: string;
  subscriptionEnd: string | null;
  /** Monthly-equivalent recurring revenue, whole currency units. */
  mrr: number | null;
  /** Null when nothing records it — the screen shows a dash. */
  lastLogin: string | null;
  contact: { email: string; phone: string; website: string };
  owner: { name: string; email: string; phone: string };
  locationsList: {
    id: string;
    name: string;
    address: string;
    services: string[];
    isPrimary: boolean;
    timezone: string | null;
    createdAt: string;
  }[];
  /**
   * The subscription row as it actually stands, for the Billing tab.
   *
   * Null when a facility has none — which the database treats as ACTIVE rather
   * than as a lockout (see member_facility_ids), so the tab has to be able to
   * say "no subscription recorded" without implying suspension.
   */
  subscription: {
    tierId: string;
    tierName: string;
    status: string;
    billingCycle: string;
    amountCents: number;
    currency: string;
    trialEndsAt: string | null;
    periodStart: string;
    periodEnd: string | null;
    cancelledAt: string | null;
  } | null;
  usersList: { id: string }[];
  clients: { status: string }[];
  limits: { locations: number; staff: number; clients: number; pets: number };
  /**
   * Modules this facility has switched on.
   *
   * Empty until there is a table for it — the platform-flags screen models this
   * shape but stores nothing. The detail page's Modules tab reads it, and an
   * empty list is the honest answer rather than another facility's.
   */
  enabledModules: string[];
}

// ============================================================================
// The people at a facility, for the superadmin's Staff and Clients tabs.
//
// Both tabs used to index mock arrays by NUMERIC facility id, so a real
// facility showed nobody — including the 23 staff and 14 clients that are
// genuinely in Postgres.
//
// Fetched per-facility rather than folded into AdminFacilityRow: the list
// screen renders every facility and has no use for either, and a facility with
// ten thousand clients must not make the detail page's first paint wait for
// them.
// ============================================================================

export interface AdminStaffRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  /** Their role on the staff record — owner, manager, groomer… */
  role: string;
  /** Employment status on the staff record: active, on_leave, terminated… */
  status: string;
  /**
   * Which record this row came from.
   *
   *   staff       a staff record, which may or may not have a login attached
   *   membership  a LOGIN with no staff record at all
   *
   * The second is not hypothetical: the demo facility's owner holds an active
   * owner membership and appears in none of its 23 staff rows. A tab that
   * listed only staff would answer "who can get into this facility?" by
   * omitting the one person who can.
   */
  source: "staff" | "membership";
  /**
   * Whether this person can actually SIGN IN, which is a different question
   * from whether a staff record exists for them.
   *
   *   active   they signed up and hold a live membership
   *   invited  a grant is waiting to be claimed
   *   none     a staff record and no route into the software
   *
   * The distinction is the whole reason a superadmin opens this tab: "we
   * created their account" and "they can get in" have been the same sentence
   * on every screen so far, and they are not the same thing.
   */
  account: "active" | "invited" | "none";
  lastActive: string | null;
  joinedAt: string;
}

export interface AdminClientRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  /** They have their own login, rather than only a record held about them. */
  hasAccount: boolean;
  pets: number;
  lastVisit: string | null;
  /** Whole currency units. */
  outstandingBalance: number;
  joinedAt: string;
}

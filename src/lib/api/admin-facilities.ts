import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import type {
  AdminClientRow,
  AdminFacilityRow,
  AdminStaffRow,
} from "@/types/admin-facility";

// ============================================================================
// Every facility on the platform, for the superadmin's list.
//
// Spec 002 phase 7. That screen read `src/data/facilities` — eleven fictional
// businesses — and joined plan, MRR, staff and clients out of four more mock
// files by NUMERIC id. A provisioned facility has none of those, so it did not
// appear at all. Two superadmins in a row created a facility and reported that
// nothing happened.
//
// ── SHAPED FOR THE SCREEN THAT EXISTS ─────────────────────────────────────
//
// The row below is the shape the list already renders: `locationsList`,
// `usersList`, `clients`, `limits`. That is not the shape I would design, and
// designing a better one would mean rewriting 753 lines of filtering, sorting,
// column definitions and CSV export in the same change that swaps the data
// source. One thing at a time; the shape is the next thing.
//
// ── WHAT HAS NO SOURCE YET SAYS SO ────────────────────────────────────────
//
// `lastLogin` is null and the screen shows "—". Nothing records a sign-in:
// Clerk knows, and we do not ask it. An invented timestamp on an admin console
// is worse than a dash, because a dash prompts the question and a plausible
// date ends it.
//
// Same for a location's street address — `locations` has a name and a timezone
// and no address column. The wizard collects one and discards it.
// ============================================================================

/** Monthly equivalent, so a yearly plan and a monthly one can be compared. */
function monthlyEquivalent(cents: number, cycle: string): number {
  const perMonth =
    cycle === "yearly" ? cents / 12 : cycle === "quarterly" ? cents / 3 : cents;
  return Math.round(perMonth) / 100;
}

export async function listFacilitiesForAdmin(): Promise<AdminFacilityRow[]> {
  const supabase = await createServerClient();

  // Five reads and a stitch, rather than one join returning a row per
  // location-per-client. RLS admits a platform admin to all of them and refuses
  // everyone else, so this returns an empty list rather than leaking to a
  // facility owner who finds the URL.
  const [facilities, subscriptions, locations, memberships, clients, staff] =
    await Promise.all([
      supabase
        .from("facilities")
        .select("id, name, slug, created_at, business_types")
        .order("created_at"),
      supabase
        .from("facility_subscriptions")
        .select(
          "facility_id, tier_id, tier_name, status, amount_cents, billing_cycle, currency, trial_ends_at, period_start, period_end, cancelled_at",
        ),
      supabase
        .from("locations")
        .select("id, facility_id, name, is_primary, timezone, created_at")
        .order("is_primary", { ascending: false }),
      supabase.from("facility_memberships").select("facility_id, profile_id"),
      supabase.from("clients").select("facility_id, status"),
      supabase
        .from("staff")
        .select(
          "facility_id, first_name, last_name, email, phone, primary_role",
        )
        .eq("primary_role", "owner"),
    ]);

  if (facilities.error) throw new Error(facilities.error.message);

  const subscriptionFor = new Map(
    (subscriptions.data ?? []).map((s) => [s.facility_id, s]),
  );
  const ownerFor = new Map((staff.data ?? []).map((s) => [s.facility_id, s]));

  const bucket = <T extends { facility_id: string }>(rows: T[] | null) => {
    const map = new Map<string, T[]>();
    for (const row of rows ?? []) {
      const list = map.get(row.facility_id);
      if (list) list.push(row);
      else map.set(row.facility_id, [row]);
    }
    return map;
  };

  const locationsFor = bucket(locations.data);
  const membershipsFor = bucket(memberships.data);
  const clientsFor = bucket(clients.data);

  return (facilities.data ?? []).map((facility) => {
    const subscription = subscriptionFor.get(facility.id);
    const owner = ownerFor.get(facility.id);
    const businessTypes = facility.business_types ?? [];

    // A facility with no subscription row counts as active, matching the
    // database gate — absence is not a lockout there and must not read as one
    // here either.
    const status = subscription?.status ?? "active";

    return {
      id: facility.id,
      name: facility.name,
      slug: facility.slug,
      status:
        status === "suspended" || status === "cancelled"
          ? ("inactive" as const)
          : ("active" as const),
      subscriptionStatus: status,
      plan: subscription?.tier_name ?? "—",
      dayJoined: facility.created_at.slice(0, 10),
      subscriptionEnd: subscription?.period_end?.slice(0, 10) ?? null,
      mrr: subscription
        ? monthlyEquivalent(
            subscription.amount_cents,
            subscription.billing_cycle,
          )
        : null,
      // Nothing records a sign-in. See the header note.
      lastLogin: null,
      contact: { email: "", phone: "", website: "" },
      owner: {
        name: owner
          ? `${owner.first_name} ${owner.last_name ?? ""}`.trim()
          : "—",
        email: owner?.email ?? "",
        phone: owner?.phone ?? "",
      },
      subscription: subscription
        ? {
            tierId: subscription.tier_id,
            tierName: subscription.tier_name,
            status: subscription.status,
            billingCycle: subscription.billing_cycle,
            amountCents: subscription.amount_cents,
            currency: subscription.currency,
            trialEndsAt: subscription.trial_ends_at,
            periodStart: subscription.period_start,
            periodEnd: subscription.period_end,
            cancelledAt: subscription.cancelled_at,
          }
        : null,
      locationsList: (locationsFor.get(facility.id) ?? []).map((location) => ({
        id: location.id,
        isPrimary: location.is_primary,
        timezone: location.timezone,
        createdAt: location.created_at,
        name: location.name,
        // `locations` has no address column. The wizard collects one and
        // discards it; until it lands, an empty string is the honest answer and
        // the screen renders "No address".
        address: "",
        // Business types are the facility's, not per-location — the schema has
        // no per-location services yet, and repeating the facility's is closer
        // to true than an empty list.
        services: businessTypes,
      })),
      usersList: (membershipsFor.get(facility.id) ?? []).map((m) => ({
        id: m.profile_id,
      })),
      clients: (clientsFor.get(facility.id) ?? []).map((c) => ({
        status: c.status,
      })),
      // No limits table yet; -1 is this codebase's "unlimited".
      limits: { locations: -1, staff: -1, clients: -1, pets: -1 },
      // No entitlements table yet; empty is honest.
      enabledModules: [],
    };
  });
}

/**
 * One facility, for the detail page.
 *
 * Built from the same assembler as the list rather than a second query, so the
 * two screens can never disagree about a facility's plan or client count. The
 * list is small — a handful of businesses — and will stay small for a long
 * time; when it does not, this becomes a filtered query and the shape does not
 * change.
 */
export async function getFacilityForAdmin(
  facilityId: string,
): Promise<AdminFacilityRow | null> {
  const all = await listFacilitiesForAdmin();
  return all.find((facility) => facility.id === facilityId) ?? null;
}

// ============================================================================
// The people at one facility.
//
// ── WHY THE FACILITY ID FROM THE PATH IS SAFE HERE ────────────────────────
//
// It is not trusted. Both routes refuse anyone who is not a platform admin,
// and RLS refuses them a second time — `staff_read` and `clients_read` admit
// `private.is_platform_admin()` or a MEMBER of that facility, so a facility
// owner who guesses another facility's uuid gets an empty array rather than a
// list. The path is a filter over rows the caller may already read; it is not
// the thing granting access. That is the same reasoning check-facility-from-
// session encodes for the request body and query string.
// ============================================================================

/**
 * Who works at a facility, and — separately — who can actually sign in.
 *
 * The account state is the reason this tab is worth building. A staff record
 * is something we hold ABOUT a person; a membership is that person's route
 * into the software. Provisioning creates the first and only promises the
 * second, and until now no screen could tell a superadmin which of their
 * facility's people had ever got in.
 */
export async function listFacilityStaffForAdmin(
  facilityId: string,
): Promise<AdminStaffRow[]> {
  const supabase = await createServerClient();

  const [staff, memberships, grants] = await Promise.all([
    supabase
      .from("staff")
      .select(
        "id, first_name, last_name, email, phone, job_title, primary_role, status, membership_id, last_active, created_at",
      )
      .eq("facility_id", facilityId)
      .order("created_at"),
    supabase
      .from("facility_memberships")
      .select("id, profile_id, role, is_active, created_at")
      .eq("facility_id", facilityId),
    supabase
      .from("facility_membership_grants")
      .select("staff_id, expires_at")
      .eq("facility_id", facilityId)
      .is("claimed_at", null),
  ]);

  if (staff.error) throw new Error(staff.error.message);

  const membershipActive = new Map(
    (memberships.data ?? []).map((m) => [m.id, m.is_active]),
  );
  const invited = new Set((grants.data ?? []).map((g) => g.staff_id));

  const rows: AdminStaffRow[] = (staff.data ?? []).map((person) => ({
    id: person.id,
    name: `${person.first_name} ${person.last_name ?? ""}`.trim(),
    email: person.email,
    phone: person.phone,
    jobTitle: person.job_title,
    role: person.primary_role,
    status: person.status,
    source: "staff",
    account:
      person.membership_id && membershipActive.get(person.membership_id)
        ? "active"
        : invited.has(person.id)
          ? "invited"
          : "none",
    lastActive: person.last_active,
    joinedAt: person.created_at.slice(0, 10),
  }));

  // ── The people with a login and no staff record ──────────────────────────
  //
  // Found by measuring rather than by reasoning: the demo facility has 23 staff
  // rows, NONE of which carries a membership_id, and one active owner
  // membership that belongs to none of them. Listing staff alone would have
  // answered "who can get into this facility?" by showing 23 people who cannot
  // and omitting the one person who can.
  const linked = new Set(
    (staff.data ?? []).map((person) => person.membership_id).filter(Boolean),
  );
  const unlinked = (memberships.data ?? []).filter((m) => !linked.has(m.id));

  if (unlinked.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in(
        "id",
        unlinked.map((m) => m.profile_id),
      );
    const profileFor = new Map((profiles ?? []).map((p) => [p.id, p]));

    for (const membership of unlinked) {
      const profile = profileFor.get(membership.profile_id);
      rows.push({
        id: membership.id,
        name: profile?.full_name || profile?.email || membership.profile_id,
        email: profile?.email ?? "",
        phone: null,
        jobTitle: null,
        role: membership.role,
        // There is no employment record to report a status from, and inventing
        // "active" would state something nobody wrote down.
        status: "—",
        source: "membership",
        account: membership.is_active ? "active" : "none",
        lastActive: null,
        joinedAt: membership.created_at.slice(0, 10),
      });
    }
  }

  return rows;
}

/**
 * A facility's clients, with their pet count.
 *
 * `hasAccount` is the customer-side twin of the staff account state: a client
 * row is a record the facility holds, and `profile_id` is that person having
 * signed up for themselves. A facility can have hundreds of the first and none
 * of the second, and the two have been indistinguishable on every screen.
 */
export async function listFacilityClientsForAdmin(
  facilityId: string,
): Promise<AdminClientRow[]> {
  const supabase = await createServerClient();

  const [clients, pets] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, name, email, phone, status, profile_id, last_visit_date, outstanding_balance, created_at",
      )
      .eq("facility_id", facilityId)
      .order("created_at", { ascending: false }),
    // Ids only, counted here. `count` per client would be one round trip per
    // row; a facility's pet ids are small next to that.
    supabase.from("pets").select("client_id").eq("facility_id", facilityId),
  ]);

  if (clients.error) throw new Error(clients.error.message);

  const petsPerClient = new Map<string, number>();
  for (const pet of pets.data ?? []) {
    petsPerClient.set(
      pet.client_id,
      (petsPerClient.get(pet.client_id) ?? 0) + 1,
    );
  }

  return (clients.data ?? []).map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    status: client.status,
    hasAccount: Boolean(client.profile_id),
    pets: petsPerClient.get(client.id) ?? 0,
    lastVisit: client.last_visit_date,
    outstandingBalance: Number(client.outstanding_balance ?? 0),
    joinedAt: client.created_at.slice(0, 10),
  }));
}

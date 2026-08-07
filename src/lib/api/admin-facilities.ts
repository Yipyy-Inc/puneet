import "server-only";

import { createServerClient } from "@/lib/supabase/server";
import type { AdminFacilityRow } from "@/types/admin-facility";

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
          "facility_id, tier_name, status, amount_cents, billing_cycle, period_end",
        ),
      supabase.from("locations").select("facility_id, name"),
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
      locationsList: (locationsFor.get(facility.id) ?? []).map((location) => ({
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
    };
  });
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { normaliseEmail } from "@/lib/messaging/send";
import type { EstimateGuest } from "@/lib/api/mappers/estimate";

// ============================================================================
// The client a guest's estimate belongs to, found or made from their details.
//
// ── WHY A SENT GUEST ESTIMATE NEEDS ONE ───────────────────────────────────
//
// A customer reads an estimate through `own_client_ids()` — clients whose
// `profile_id` is their account. A guest estimate has no client, so no account
// could ever open its link, and no reminder could be addressed to anybody.
//
// Joining a facility (`register_client` → `link_client_at`) CLAIMS a client
// row the facility already has with the person's verified email. So the send
// only has to put the estimate on such a row: the guest signs in or creates an
// account with that address, joins, and the estimate is on their dashboard.
//
// ── FOUND FIRST, MADE ONLY WHEN THERE IS NONE ─────────────────────────────
//
// Somebody quoted as a guest may already be a client — the front desk simply
// did not look them up. Matching the email first keeps one person one row; a
// duplicate would split their bookings and let the wrong row be claimed.
//
// Written with the caller's session, so `clients_insert` decides: a member of
// staff who may send estimates but not add clients gets `not_allowed`, and the
// estimate stays a guest's rather than the check being stepped around.
// ============================================================================

export type GuestClientResult =
  | { clientId: string; created: boolean }
  | { clientId: null; reason: "no_email" | "not_allowed" | "failed" };

/** `%` and `_` are wildcards to `ilike`; an address may contain `_`. */
function literal(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function clientForGuest(
  supabase: SupabaseClient,
  facilityId: string,
  guest: EstimateGuest | null,
): Promise<GuestClientResult> {
  const email = guest?.email ? normaliseEmail(guest.email) : null;
  if (!email) return { clientId: null, reason: "no_email" };

  const find = async () => {
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("facility_id", facilityId)
      .ilike("email", literal(email))
      .limit(1)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  };

  const existing = await find();
  if (existing) return { clientId: existing, created: false };

  const { data, error } = await supabase
    .from("clients")
    .insert({
      facility_id: facilityId,
      name: guest?.name?.trim() || email.split("@")[0],
      email,
      phone: guest?.phone?.trim() || null,
      status: "active",
      details: {},
    } as never)
    .select("id")
    .single();

  if (error) {
    // Somebody added them a moment ago: use that row.
    if (error.code === "23505") {
      const raced = await find();
      if (raced) return { clientId: raced, created: false };
    }
    return {
      clientId: null,
      reason: error.code === "42501" ? "not_allowed" : "failed",
    };
  }
  return { clientId: (data as { id: string }).id, created: true };
}

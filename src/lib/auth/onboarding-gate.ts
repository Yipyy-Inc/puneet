import "server-only";

import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// An invited hire is not a colleague yet.
//
// This exists because making the invite REAL opened a hole that did not exist
// while it was a mock. /api/staff/[id]/invite creates a facility_memberships
// row so the new account has a facility at all — and canAccessFacilityPortal
// admits ANY active membership:
//
//     viewer.source === "session" && (isPlatformAdmin || memberships.length > 0)
//
// which was correct when a membership meant "someone who works here and has
// finished joining". After this change a membership also means "someone we
// emailed yesterday who has set a password and nothing else", and that person
// could open /facility/dashboard.
//
// Not a hole in canAccessFacilityPortal — the rule there is right for what it
// answers, and widening or narrowing it would change the answer for every
// existing member. The missing question is a different one: has this person
// finished joining? That is what `staff.status = 'invited'` records, and this
// is where it gets asked.
//
// RLS still decides what they could actually READ if they got in — an invited
// groomer sees a groomer's rows. This is routing, not the boundary. But routing
// someone mid-onboarding into an admin console is wrong even when it is empty.
// ============================================================================

/**
 * Send a still-invited staff member to their checklist.
 *
 * A no-op for anyone else, including someone with no staff record at all — a
 * platform admin reviewing a facility has no row here and must not be bounced.
 *
 * Costs one indexed lookup per render of a gated layout. Cheaper than the
 * alternative, which is putting the status in the JWT and then having it be
 * wrong for up to an hour after activation.
 *
 * ── AN OWNER IS NEVER SENT HERE (reported from production) ────────────────
 *
 * A newly provisioned facility's owner signed in and landed on "a few things
 * left before your first shift — your manager has not set up your onboarding
 * checklist yet". She IS the manager. There is nobody above an owner to build
 * a checklist, so that screen could never stop being empty and she could never
 * leave it.
 *
 * The cause was in the data and is fixed there (20260807420000:
 * record_grant_for_staff no longer marks an owner `invited`, because an owner
 * has no onboarding to submit and the status was therefore terminal). This
 * check stays anyway: routing a proprietor into a new hire's checklist is
 * wrong however the status got that way, and the cost is one column.
 */
export async function redirectIfStillOnboarding(
  email: string | null,
): Promise<void> {
  if (!email) return;

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("staff")
    .select("status, primary_role")
    .ilike("email", email)
    .maybeSingle();

  if (data?.status === "invited" && data.primary_role !== "owner") {
    redirect("/employee/onboarding");
  }
}

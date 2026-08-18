import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// An invited hire is not a colleague yet.
//
// This exists because making the invite REAL opened a hole that did not exist
// while it was a mock. /api/staff/[id]/invite creates a facility_memberships
// row so the new account has a facility at all — and a membership then means
// "someone we emailed yesterday who has set a password and nothing else", not
// "someone who works here and has finished joining". That person could open
// /facility/dashboard.
//
// STILL TRUE AFTER ADR 0005, and worth being precise about. canAccessFacilityPortal
// now requires ADMIN access rather than any membership, which narrows this to
// invited admins — but that is exactly the case that reached production: the
// owner of a newly provisioned facility, invited and not yet finished. An
// invited groomer is now sent to /employee instead, and lands here for the same
// reason.
//
// Not a hole in canAccessFacilityPortal — the rule there answers "may you run
// this business", and it answers it correctly. The missing question is a
// different one: has this person finished joining? That is what
// `staff.status = 'invited'` records, and this is where it gets asked.
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
const CHECKLIST = "/employee/onboarding";

export async function redirectIfStillOnboarding(
  email: string | null,
): Promise<void> {
  if (!email) return;

  // ── THE CHECKLIST IS INSIDE THE PORTAL THIS NOW GUARDS ──────────────────
  //
  // This used to run only in the facility layout, where the destination was
  // somewhere else entirely and could never be the current page. It runs in the
  // employee layout too now, and /employee/onboarding is under /employee — so
  // without this line the checklist would redirect to itself forever.
  //
  // `x-pathname` is stamped by src/proxy.ts, the same header guardPortal reads.
  // Absent means the proxy did not run, which for a rendered layout does not
  // happen; an empty string matches no prefix, so the gate still fires rather
  // than failing open into a loop.
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname.startsWith(CHECKLIST)) return;

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("staff")
    .select("status, primary_role")
    .ilike("email", email)
    .maybeSingle();

  if (data?.status === "invited" && data.primary_role !== "owner") {
    redirect(CHECKLIST);
  }
}

import type { Viewer } from "@/lib/auth/viewer";
import type { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Which staff row is the caller, at this facility.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// `staff.membership_id` is the ONLY thing tying a signed-in identity to a staff
// row. The lookup is three lines, which is exactly why it had been pasted six
// times across four scheduling routes by 2026-08-21 — the clock route alone
// held three copies. Six chances to drift, and the failure is silent: get it
// wrong and the caller is simply "not on staff", so a clock-in 422s or a leave
// request files under nobody.
//
// ── IT IS THE APP-SIDE HALF OF `private.own_staff_ids()` ──────────────────
//
// The policies answer this same question inside Postgres, but `private` is a
// schema PostgREST cannot reach, so a route that needs the id in JavaScript —
// to default a request's `staff_id`, or to filter "my shifts" — has to ask
// again. Keeping the two in step matters: if this disagrees with the policy,
// the row is written under one id and refused under another.
//
// ── A MEMBER OF STAFF IS NOT THE SAME AS A MEMBER ─────────────────────────
//
// A facility admin can hold a membership and have NO staff row — they own the
// business and are not on the roster. That is why this returns undefined rather
// than throwing: "you are not rostered here" is a 422 the caller phrases in its
// own terms (you cannot clock in / you cannot file leave), not an error.
// ============================================================================

/** The client `createServerClient()` hands back, named off it so the two cannot drift. */
type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

/**
 * The caller's `staff.id` at `facilityId`, or undefined if they are not
 * rostered there.
 *
 * Reads through the CALLER's client, never the service key — a lookup that
 * bypassed RLS here would happily resolve a staff row at a facility the caller
 * has nothing to do with.
 */
export async function ownStaffId(
  supabase: ServerClient,
  viewer: Viewer,
  facilityId: string,
): Promise<string | undefined> {
  const membership = viewer.memberships.find(
    (m) => m.facilityId === facilityId,
  );
  if (!membership) return undefined;

  const { data } = await supabase
    .from("staff")
    .select("id")
    .eq("membership_id", membership.membershipId)
    .maybeSingle();

  return (data as { id: string } | null)?.id ?? undefined;
}

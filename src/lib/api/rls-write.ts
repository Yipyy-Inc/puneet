import "server-only";

import { NextResponse } from "next/server";

// ============================================================================
// A denied UPDATE or DELETE looks exactly like a successful one.
//
// ── THE MECHANISM ─────────────────────────────────────────────────────────
//
// An INSERT that fails a `with check` policy raises 42501, and `writeFailure`
// turns that into a 403. An UPDATE or DELETE that fails a `using` policy does
// NOT raise: the row is simply not visible to the statement, so it affects zero
// rows and PostgREST returns success.
//
// Measured on the stylist write route before this existed — a groomer, who
// holds no `manage_staff`, sent a skill-tier change:
//
//   PUT /api/grooming/stylists/fs-groom-08   ->   204 No Content
//
// Nothing was written. RLS held. And the caller was told it had worked, so the
// screen showed "Grooming profile updated" over a profile that never changed.
// The data was safe; the answer was a lie.
//
// The same shape appeared earlier as `SELECT ... FOR UPDATE` returning zero
// rows under a failing UPDATE policy (20260806480000). Twice is a pattern, so
// it gets a helper and a gate rather than a third comment.
//
// ── HOW TO USE IT ─────────────────────────────────────────────────────────
//
//   const { data, error } = await supabase
//     .from("thing").update(patch).eq("id", id).select("id");
//   if (error) return writeFailure(error, { … });
//   const denied = deniedIfUntouched(data, "Not allowed to edit this.");
//   if (denied) return denied;
//
// The `.select()` is what makes the check possible: without it PostgREST
// returns no rows to count. `scripts/check-rls-writes.ts` fails the build on an
// update or delete that has neither a `.select()` nor a stated reason.
// ============================================================================

/**
 * Turn "zero rows touched" into the 403 it actually was.
 *
 * Pass the `data` from a mutation that ended in `.select()`. Returns a response
 * to send, or null to carry on.
 *
 * Use this when the mutation is expected to hit at least one row — which is the
 * normal case, because the route has usually just looked the row up. For a
 * delete where an empty set is legitimate, use `deniedIfExpectedRowsSurvived`.
 */
export function deniedIfUntouched(
  rows: unknown[] | null,
  message: string,
): NextResponse | null {
  if (rows && rows.length > 0) return null;
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Did a DELETE get refused, given what was there before it?
 *
 * A refused DELETE and an empty table give the same answer — zero rows — so the
 * only way to tell them apart is to know the count first. Rows existed and none
 * were removed means refused.
 *
 * Separate from the response builder below because not every caller answers a
 * refusal with a 403: `grooming/services` reports it through a `pricesWritten`
 * flag on an otherwise-successful patch, and reaching for a NextResponse it
 * then discards would be using a builder as a predicate.
 */
export function deleteWasRefused(
  expectedCount: number | null,
  removed: unknown[] | null,
): boolean {
  if ((expectedCount ?? 0) === 0) return false;
  return !removed || removed.length === 0;
}

/**
 * The delete variant of `deniedIfUntouched`, for when "nothing to remove" is a
 * legitimate outcome. Count before, pass both.
 */
export function deniedIfExpectedRowsSurvived(
  expectedCount: number | null,
  removed: unknown[] | null,
  message: string,
): NextResponse | null {
  if (!deleteWasRefused(expectedCount, removed)) return null;
  return NextResponse.json({ error: message }, { status: 403 });
}

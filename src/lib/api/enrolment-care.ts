import "server-only";

import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import type { BookingCare } from "@/types/booking";

// ============================================================================
// A TRAINING ENROLMENT'S CARE, ON THE BOOKINGS IT MADE (2026-10-01).
//
// `enroll_in_training_series` books a dog into every remaining session of a
// class, one booking per session, with empty details. The booking form's
// Feeding and Medications steps — on for training where the facility turned
// them on — belong on each of those bookings, so this writes them there,
// right after the enrolment made them.
//
// The bookings are tied as one request (`bookingGroup`), as a multi-day
// daycare request is, so a once-per-request fee — the medication fee — lands
// once, on the first session, and not once per session.
//
// Written with the service role, and only onto the ids the enrolment itself
// returned: the caller has just created them, and an enrolling member of
// staff need not also hold edit_bookings to give them their care. The care
// is the four fields of `bookingCareSchema`, parsed strictly by the route —
// nothing else of `details` can arrive this way.
// ============================================================================

export async function writeEnrolmentCare(input: {
  enrollmentId: string;
  /** The enrolment's bookings, in session order. */
  bookingIds: string[];
  care: BookingCare;
}): Promise<{ ok: boolean }> {
  const { bookingIds, care } = input;
  if (bookingIds.length === 0) return { ok: true };
  if (!hasServiceRoleKey()) return { ok: false };

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("bookings")
    .select("id, details")
    .in("id", bookingIds);
  if (error || !rows) return { ok: false };

  const of = bookingIds.length;
  const results = await Promise.all(
    bookingIds.map((id, index) => {
      const row = rows.find((candidate) => candidate.id === id);
      const details = {
        ...((row?.details ?? {}) as Record<string, unknown>),
        ...care,
        ...(of > 1
          ? {
              bookingGroup: {
                id: `enrollment:${input.enrollmentId}`,
                part: index + 1,
                of,
              },
            }
          : {}),
      };
      // `.select` so a write that reached no row is told from one that did.
      return admin
        .from("bookings")
        .update({ details } as never)
        .eq("id", id)
        .select("id");
    }),
  );
  return {
    ok: results.every(
      (result) => !result.error && (result.data?.length ?? 0) === 1,
    ),
  };
}

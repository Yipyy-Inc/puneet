import { notFound, redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// This route is a redirect. It has been one since it was written.
//
// ── WHAT WAS HERE ─────────────────────────────────────────────────────────
//
// 1,197 lines of booking-detail UI behind a mount-time `router.replace`, so
// none of it could be reached in the normal path. Two of the hollow money
// handlers in the sweep lived in it: `onConfirm` for the payment modal toasted
// "Payment accepted via card for #12" and called nothing, and the cancel modal
// did the same.
//
// ── AND THE REDIRECT ITSELF WAS BROKEN ────────────────────────────────────
//
// It resolved the destination out of `initialBookings` — the mock array:
//
//     const booking = initialBookings.find((b) => b.id === bookingId);
//     useEffect(() => { if (booking?.clientId) router.replace(...) }, ...);
//
// A booking created since the migration is not in that array, so the effect
// never fired and the page fell through to its own "Booking not found."
// EVERY LINK TO THIS ROUTE WAS BROKEN FOR REAL DATA — and there are eight of
// them, from Billing, the check-in screen, the client page and the kennel
// view.
//
// ── WHY A SERVER REDIRECT ─────────────────────────────────────────────────
//
// The old one shipped a page, hydrated it, ran an effect and then navigated,
// which is three round trips to decide a URL. The destination is a property of
// the booking, so it is resolved here and answered with a 307. A booking that
// genuinely does not exist — or belongs to a facility this session cannot see,
// which RLS makes the same thing — gets the 404 it should always have had.
// ============================================================================

export const dynamic = "force-dynamic";

export default async function FacilityBookingRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ref = Number(id);
  if (!Number.isFinite(ref)) notFound();

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("bookings")
    .select("ref, clients ( ref )")
    .eq("ref", ref)
    .maybeSingle();

  const booking = data as {
    ref: number;
    clients: { ref: number } | null;
  } | null;
  if (!booking?.clients?.ref) notFound();

  redirect(
    `/facility/dashboard/clients/${booking.clients.ref}/bookings/${booking.ref}`,
  );
}

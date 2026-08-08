import { notFound, redirect } from "next/navigation";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import { cloverConfig } from "@/lib/clover/config";
import { chargeableConnection } from "@/lib/clover/connection";

import { PayBooking } from "./_components/pay-booking";
import { PayNotice } from "./_components/pay-notice";

// ============================================================================
// Paying a booking by card.
//
// ── WHY THIS IS NOT UNDER A PORTAL ────────────────────────────────────────
//
// Two different people legitimately open this URL: the customer who owes the
// money, and a member of staff standing at the counter with that customer's
// card. Putting it under /customer or /facility would mean picking one of them
// and making the other take a detour to the same booking.
//
// So it sits at the top level and lets `bookings_read` decide — the same policy
// the charge route relies on. It admits a platform admin, the client the
// booking belongs to, or someone with view_bookings at the facility. If the row
// comes back the caller is one of those; if it does not, they are not.
//
// A booking that does not exist and a booking the caller may not see both get
// notFound(). Which of the two it was is not theirs to learn.
//
// ── THE AMOUNT IS READ HERE, NOT PASSED IN ────────────────────────────────
//
// `amount_due - amount_paid`, off the row. It is shown to the customer and sent
// to the browser for the button label only — the charge route reads the same
// two columns again when the token comes back, so a page left open while
// somebody takes a payment at the counter cannot charge the stale figure.
//
// ── THE CONNECTION IS READ WITH THE ADMIN CLIENT ──────────────────────────
//
// `payment_connections_read` admits facility members, and a customer paying
// their own booking is not one. The two fields the browser needs — the merchant
// id and the PUBLIC api key — are public by construction: they are handed to
// Clover's SDK in the page. No token is read here, and the read only happens
// after the booking above came back, so the caller has already proved they may
// see this booking.
// ============================================================================

export const dynamic = "force-dynamic";

interface BookingRow {
  id: string;
  ref: number;
  facility_id: string;
  service: string | null;
  service_type: string | null;
  start_at: string | null;
  status: string;
  amount_due: number | null;
  amount_paid: number | null;
  facilities: { name: string } | null;
}

export default async function PayBookingPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const bookingRef = Number(ref);
  if (!Number.isInteger(bookingRef) || bookingRef <= 0) notFound();

  const viewer = await getViewer();
  if (viewer.source !== "session") {
    // The PARSED ref, not the raw segment — "/pay/0896" and "/pay/896" are the
    // same booking, and only one of them should ever appear in a `next=`.
    redirect(`/sign-in?next=${encodeURIComponent(`/pay/${bookingRef}`)}`);
  }

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, ref, facility_id, service, service_type, start_at, status, amount_due, amount_paid, facilities ( name )",
    )
    .eq("ref", bookingRef)
    .maybeSingle();

  const booking = data as BookingRow | null;
  if (!booking) notFound();

  const facilityName = booking.facilities?.name ?? "the facility";
  const owedCents = Math.round(
    (Number(booking.amount_due ?? 0) - Number(booking.amount_paid ?? 0)) * 100,
  );

  if (booking.status === "cancelled") {
    return (
      <PayNotice
        tone="neutral"
        title="This booking was cancelled"
        body={`Nothing is owed on booking #${booking.ref}. If you think that is wrong, ${facilityName} can put it right.`}
      />
    );
  }

  if (owedCents <= 0) {
    return (
      <PayNotice
        tone="paid"
        title="Paid in full"
        body={`Booking #${booking.ref} has nothing outstanding.`}
      />
    );
  }

  // Everything below is about whether a card CAN be taken. Each branch says
  // which part is missing rather than one blanket "unavailable", because the
  // person who can fix it is different in each case.
  const connection = await chargeableConnection(booking.facility_id);
  if (!connection) {
    return (
      <PayNotice
        tone="problem"
        title="This facility cannot take card payments yet"
        body={`${facilityName} has not connected a merchant account, so there is nowhere for this money to go. They can settle it with you directly.`}
      />
    );
  }

  // The merchant's OWN estate. This decides which Clover the BROWSER loads its
  // SDK from, so a sandbox merchant served production's sdk.js would tokenise
  // against an account that does not exist there.
  const config = cloverConfig(connection.environment);
  if (!config) {
    return (
      <PayNotice
        tone="problem"
        title="Card payments are not set up"
        body="This deployment cannot reach the Clover environment this facility is connected to."
      />
    );
  }

  // Both are refusals rather than defaults. A missing currency would mean
  // guessing what a merchant settles in, and a missing key would mean the card
  // fields could not be rendered at all.
  if (!connection.currency || !connection.publicApiKey) {
    return (
      <PayNotice
        tone="problem"
        title="This facility's payment account is not ready"
        body={`${facilityName} needs to reconnect their merchant account before a card can be taken here.`}
      />
    );
  }

  return (
    <PayBooking
      bookingId={booking.id}
      bookingRef={booking.ref}
      facilityName={facilityName}
      service={booking.service}
      serviceType={booking.service_type}
      startAt={booking.start_at}
      amountCents={owedCents}
      currency={connection.currency}
      merchantId={connection.merchantId}
      publicApiKey={connection.publicApiKey}
      sdkUrl={config.checkoutSdkUrl}
    />
  );
}

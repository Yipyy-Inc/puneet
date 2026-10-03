import { BookingDetailsScreen } from "@/components/bookings/details/booking-details-screen";

// ============================================================================
// One booking, as the facility runs it — the client's Booking_Details mocks
// for boarding, daycare, grooming and training (2026-10-03).
//
// A server page that only reads its params. Everything the page used to be —
// 2,194 lines of reads, handlers, the till and fourteen dialogs — is the
// screen's now, split by what it does (src/components/bookings/details/), so
// /employee/bookings/[id] renders the very same thing inside its own shell.
// ============================================================================

export default async function ClientBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string; bookingId: string }>;
}) {
  const { id, bookingId } = await params;
  return (
    <BookingDetailsScreen
      bookingRef={Number.parseInt(bookingId, 10)}
      clientRef={Number.parseInt(id, 10)}
    />
  );
}

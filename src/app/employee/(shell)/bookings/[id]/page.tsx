import { BookingDetailsScreen } from "@/components/bookings/details/booking-details-screen";

// ============================================================================
// Section 5B / Part 0.3 — employee booking detail.
//
// The SAME booking screen as the facility portal, rendered INSIDE the
// /employee shell so the FacilityRbacProvider stays mounted — which is what
// makes its gates apply (view_booking_amounts omits the payment card and
// every amount; edit_bookings / cancel_bookings / log_incidents drop their
// actions from the header and More).
//
// The screen itself refuses a scoped viewer (view_bookings = assigned_only)
// a booking outside their assigned set — AccessRestricted, never the record
// (8B) — and takes the client from the booking, since this URL names none.
// ============================================================================

export default async function EmployeeBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingDetailsScreen bookingRef={Number.parseInt(id, 10)} />;
}

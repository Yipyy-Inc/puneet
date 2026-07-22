"use client";

import { use, useMemo } from "react";
import { bookings } from "@/data/bookings";
import { useAssignedScope } from "@/lib/facility-permissions";
import { isBookingAssignedTo } from "@/lib/api/booking";
import { AccessRestricted } from "@/components/employee/AccessRestricted";
import ClientBookingDetailPage from "@/app/facility/dashboard/clients/[id]/bookings/[bookingId]/page";

// ============================================================================
// Section 5B / Part 0.3 — employee booking detail.
//
// Renders the SAME booking detail component as admin, but INSIDE the /employee
// shell so the FacilityRbacProvider stays mounted — which is what makes the
// detail's gates actually apply (view_booking_amounts hides the price breakdown
// + payment section; edit_bookings / cancel_bookings / log_incidents drop their
// actions from the action bar + More menu).
//
// Before rendering, a scoped viewer (view_bookings = assigned_only) opening a
// booking outside their assigned set gets a 403 → AccessRestricted, never the
// record. The decision is the data-layer helper isBookingAssignedTo (8B).
// ============================================================================

export default function EmployeeBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const bookingId = parseInt(id, 10);
  const booking = bookings.find((b) => b.id === bookingId);
  const assignedStaffId = useAssignedScope("view_bookings");

  // The shared detail page reads its route params via use(params); hand it a
  // STABLE promise (a fresh one each render would suspend forever).
  const detailParams = useMemo(
    () =>
      Promise.resolve({
        id: String(booking?.clientId ?? ""),
        bookingId: String(bookingId),
      }),
    [booking?.clientId, bookingId],
  );

  const denied =
    !booking ||
    (assignedStaffId != null && !isBookingAssignedTo(booking, assignedStaffId));

  if (denied) return <AccessRestricted />;
  return <ClientBookingDetailPage params={detailParams} />;
}

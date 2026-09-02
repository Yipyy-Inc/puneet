"use client";

import { use, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAssignedScope } from "@/lib/facility-permissions";
import { bookingQueries, useAssignedBookingRefs } from "@/lib/api/booking";
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
  // The record came from `bookings` in src/data, so a real booking's ref had to
  // be one the fixture happened to invent or this gate refused it — the same
  // defect the employee CLIENT page had (b8c471e8).
  const { data: booking, isPending: bookingPending } = useQuery({
    ...bookingQueries.detail(bookingId),
    enabled: Number.isInteger(bookingId),
  });
  const assignedStaffId = useAssignedScope("view_bookings");
  const { refs: assignedRefs, pending: assignedPending } =
    useAssignedBookingRefs(assignedStaffId);

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

  // Decide nothing while either answer is outstanding.
  if (bookingPending || assignedPending) return null;

  const denied =
    !booking || (assignedStaffId != null && !assignedRefs?.has(booking.id));

  if (denied) return <AccessRestricted />;
  return <ClientBookingDetailPage params={detailParams} />;
}

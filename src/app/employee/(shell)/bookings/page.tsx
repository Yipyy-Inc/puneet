import BookingsPage from "@/app/facility/dashboard/bookings/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Route-level gate: the nav hides Bookings without view_bookings, and this
// stops the URL being reachable directly. assigned_only viewers still get the
// page, scoped to their assigned bookings in the data layer (8B).
export default function EmployeeBookingsPage() {
  return (
    <RequirePermission permKey="view_bookings">
      <BookingsPage />
    </RequirePermission>
  );
}

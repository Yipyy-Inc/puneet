import OnlineBookingPage from "@/app/facility/dashboard/online-booking/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Online-booking is the public-widget configuration surface → gated on the
// booking-calendar management key.
export default function EmployeeOnlineBookingPage() {
  return (
    <RequirePermission permKey="manage_booking_calendar">
      <OnlineBookingPage />
    </RequirePermission>
  );
}

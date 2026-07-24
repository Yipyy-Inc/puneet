// The admin /dashboard/communications route just redirects to messaging, so we
// reuse the real messaging hub here directly.
import FacilityMessagingPage from "@/app/facility/dashboard/messaging/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

export default function EmployeeCommunicationsPage() {
  return (
    <RequirePermission permKey="communicate_clients">
      <FacilityMessagingPage />
    </RequirePermission>
  );
}

// The admin /dashboard/notifications route just redirects to the unified center,
// so we reuse the real notification-center page here directly.
import FacilityNotificationsPage from "@/app/facility/notifications/page";

// Personal, always-on: every employee reaches their own notification center, so
// this route carries NO permission gate by design.
export default function EmployeeNotificationsPage() {
  return <FacilityNotificationsPage />;
}

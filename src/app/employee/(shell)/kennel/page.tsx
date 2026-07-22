import KennelViewPage from "@/app/facility/dashboard/kennel-view/page";
import { RequireAnyPermission } from "@/components/employee/AccessRestricted";

// Kennel View sits under both Boarding and Daycare in the nav, so either
// dashboard key grants it.
export default function EmployeeKennelPage() {
  return (
    <RequireAnyPermission
      permKeys={["boarding_view_dashboard", "daycare_view_dashboard"]}
    >
      <KennelViewPage />
    </RequireAnyPermission>
  );
}

import ResourcesPage from "@/app/facility/dashboard/resources/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// No dedicated resources key exists. Resources (rooms, pools, vans, equipment)
// are service infrastructure, so we gate on the nearest section key, view_services.
export default function EmployeeResourcesPage() {
  return (
    <RequirePermission permKey="view_services">
      <ResourcesPage />
    </RequirePermission>
  );
}

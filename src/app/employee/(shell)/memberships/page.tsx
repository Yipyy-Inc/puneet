import MembershipsPage from "@/app/facility/services/memberships/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Reuses the real facility memberships page, gated on the same key the nav item
// uses (view_services).
export default function EmployeeMembershipsPage() {
  return (
    <RequirePermission permKey="view_services">
      <MembershipsPage />
    </RequirePermission>
  );
}

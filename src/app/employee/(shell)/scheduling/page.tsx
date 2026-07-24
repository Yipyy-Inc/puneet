import SchedulingPage from "@/app/facility/dashboard/services/scheduling/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Reuses the real facility staff-scheduling page, gated on the same key the nav
// item uses. assigned_only viewers reach it scoped to their own shifts (8B).
export default function EmployeeSchedulingPage() {
  return (
    <RequirePermission permKey="scheduling_view_all">
      <SchedulingPage />
    </RequirePermission>
  );
}

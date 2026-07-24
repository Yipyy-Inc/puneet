import EvaluationsPage from "@/app/facility/dashboard/evaluations/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// NOTE: there is no dedicated "evaluations" PermissionKey. Evaluations are
// assessment appointments, so we gate on the nearest section key, view_bookings.
export default function EmployeeEvaluationsPage() {
  return (
    <RequirePermission permKey="view_bookings">
      <EvaluationsPage />
    </RequirePermission>
  );
}

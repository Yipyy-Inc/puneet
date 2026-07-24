import EvaluationsPage from "@/app/facility/dashboard/evaluations/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Evaluations are assessment appointments — gated on their dedicated per-feature
// key so the nav toggle and route access track together (4.1).
export default function EmployeeEvaluationsPage() {
  return (
    <RequirePermission permKey="view_evaluations">
      <EvaluationsPage />
    </RequirePermission>
  );
}

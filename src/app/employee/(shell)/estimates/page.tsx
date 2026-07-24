import EstimatesPage from "@/app/facility/dashboard/estimates/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Estimates are booking quotes. Gated on the dedicated per-feature key so the
// nav toggle and route access track together (4.1).
export default function EmployeeEstimatesPage() {
  return (
    <RequirePermission permKey="view_estimates">
      <EstimatesPage />
    </RequirePermission>
  );
}

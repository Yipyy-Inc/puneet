import IntakeFormsPage from "@/app/facility/dashboard/forms/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Intake forms — gated on their dedicated per-feature view key so the nav toggle
// and route access track together (4.1).
export default function EmployeeFormsPage() {
  return (
    <RequirePermission permKey="view_intake_forms">
      <IntakeFormsPage />
    </RequirePermission>
  );
}

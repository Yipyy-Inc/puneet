import IntakeFormsPage from "@/app/facility/dashboard/forms/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// No view-only forms key exists; settings_manage_forms is the controlling key
// for the intake-forms module.
export default function EmployeeFormsPage() {
  return (
    <RequirePermission permKey="settings_manage_forms">
      <IntakeFormsPage />
    </RequirePermission>
  );
}

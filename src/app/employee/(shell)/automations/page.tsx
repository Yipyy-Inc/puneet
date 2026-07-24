import AutomationsPage from "@/app/facility/dashboard/automations/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

export default function EmployeeAutomationsPage() {
  return (
    <RequirePermission permKey="marketing_manage_automations">
      <AutomationsPage />
    </RequirePermission>
  );
}

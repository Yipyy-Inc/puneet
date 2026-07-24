import ReportsPage from "@/app/facility/dashboard/reports/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

export default function EmployeeReportsPage() {
  return (
    <RequirePermission permKey="ops_view_reports">
      <ReportsPage />
    </RequirePermission>
  );
}

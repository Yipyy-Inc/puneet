import DaycarePage from "@/app/facility/dashboard/services/daycare/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

export default function EmployeeDaycarePage() {
  return (
    <RequirePermission permKey="daycare_view_dashboard">
      <DaycarePage />
    </RequirePermission>
  );
}

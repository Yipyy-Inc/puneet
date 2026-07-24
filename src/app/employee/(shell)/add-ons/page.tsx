import AddOnsPage from "@/app/facility/dashboard/add-ons/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

export default function EmployeeAddOnsPage() {
  return (
    <RequirePermission permKey="view_services">
      <AddOnsPage />
    </RequirePermission>
  );
}

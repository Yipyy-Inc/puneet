import RetailPage from "@/app/facility/dashboard/services/retail/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

export default function EmployeeRetailPage() {
  return (
    <RequirePermission permKey="retail_pos_access">
      <RetailPage />
    </RequirePermission>
  );
}

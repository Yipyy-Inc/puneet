import InventoryPage from "@/app/facility/dashboard/inventory/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

export default function EmployeeInventoryPage() {
  return (
    <RequirePermission permKey="view_inventory">
      <InventoryPage />
    </RequirePermission>
  );
}

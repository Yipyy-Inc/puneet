import LoyaltyOverviewPage from "@/app/facility/dashboard/loyalty/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

export default function EmployeeLoyaltyPage() {
  return (
    <RequirePermission permKey="marketing_manage_loyalty">
      <LoyaltyOverviewPage />
    </RequirePermission>
  );
}

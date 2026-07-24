import LoyaltyReportsPage from "@/app/facility/dashboard/marketing/loyalty-reports/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Reuses the real facility loyalty-reports page, gated on the same key the nav
// item uses (marketing_view_analytics).
export default function EmployeeLoyaltyReportsPage() {
  return (
    <RequirePermission permKey="marketing_view_analytics">
      <LoyaltyReportsPage />
    </RequirePermission>
  );
}

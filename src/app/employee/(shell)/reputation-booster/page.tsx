import ReputationBoosterPage from "@/app/facility/dashboard/marketing/reputation-booster/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Reuses the real facility reputation-booster page, gated on the same key the
// nav item uses (marketing_manage_reviews).
export default function EmployeeReputationBoosterPage() {
  return (
    <RequirePermission permKey="marketing_manage_reviews">
      <ReputationBoosterPage />
    </RequirePermission>
  );
}

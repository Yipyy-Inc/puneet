import MarketingPage from "@/app/facility/dashboard/marketing/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

export default function EmployeeMarketingPage() {
  return (
    <RequirePermission permKey="marketing_view">
      <MarketingPage />
    </RequirePermission>
  );
}

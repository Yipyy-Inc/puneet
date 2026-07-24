import InsightsPage from "@/app/facility/dashboard/insights/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// The smart-insights key is ops_smart_insights (there is no "view_smart_insights").
export default function EmployeeInsightsPage() {
  return (
    <RequirePermission permKey="ops_smart_insights">
      <InsightsPage />
    </RequirePermission>
  );
}

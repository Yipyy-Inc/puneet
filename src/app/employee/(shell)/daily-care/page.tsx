import { DailyCareView } from "@/components/daily-care/DailyCareView";
import { RequireAnyPermission } from "@/components/employee/AccessRestricted";

// Section 5D — Daily Care renders the SAME view as admin
// (/facility/dashboard/daily-care) inside the /employee shell, so the RBAC
// provider is active and the per-row log gates apply (log_feedings on feeding
// rows, log_medications on medication rows; rows stay visible read-only).
//
// Route gate mirrors the nav's section rule (Table 3): log_feedings OR
// boarding_daily_care_log — so boarding staff AND daycare attendants reach it,
// while a Groomer (perform_grooming only) gets neither the nav entry nor the URL.
export default function EmployeeDailyCarePage() {
  return (
    <RequireAnyPermission
      permKeys={["log_feedings", "boarding_daily_care_log"]}
    >
      <DailyCareView />
    </RequireAnyPermission>
  );
}

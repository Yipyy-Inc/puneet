import ModuleRequestPage from "@/app/facility/dashboard/modules/request/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// NOTE: there is no standalone /dashboard/modules admin page — enabling/disabling
// modules lives inside Settings, and the only standalone modules route is the
// custom-module request screen, which we surface here. Gated on the nearest
// settings key (the requested "facility_settings" is manage_facility_settings).
export default function EmployeeModulesPage() {
  return (
    <RequirePermission permKey="manage_facility_settings">
      <ModuleRequestPage />
    </RequirePermission>
  );
}

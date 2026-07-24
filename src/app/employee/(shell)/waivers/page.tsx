import WaiversPage from "@/app/facility/dashboard/waivers/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// No dedicated waivers key exists. Waivers are signable forms, so we gate on the
// forms management key (settings_manage_forms).
export default function EmployeeWaiversPage() {
  return (
    <RequirePermission permKey="settings_manage_forms">
      <WaiversPage />
    </RequirePermission>
  );
}

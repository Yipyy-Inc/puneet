import WaiversPage from "@/app/facility/dashboard/waivers/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Digital waivers — gated on their dedicated per-feature view key so the nav
// toggle and route access track together (4.1).
export default function EmployeeWaiversPage() {
  return (
    <RequirePermission permKey="view_waivers">
      <WaiversPage />
    </RequirePermission>
  );
}

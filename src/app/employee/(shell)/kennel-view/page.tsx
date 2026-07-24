import KennelViewPage from "@/app/facility/dashboard/kennel-view/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// "Occupancy Calendar" — reuses the real facility kennel-view page, gated on the
// same dedicated per-feature key the nav item uses (4.1).
export default function EmployeeKennelViewPage() {
  return (
    <RequirePermission permKey="view_occupancy_calendar">
      <KennelViewPage />
    </RequirePermission>
  );
}

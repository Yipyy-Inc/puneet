import FacilityStaffPage from "@/app/facility/dashboard/staff/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// view_staff is the "View staff directory" key (the requested view_staff_directory
// does not exist under that name).
export default function EmployeeStaffPage() {
  return (
    <RequirePermission permKey="view_staff">
      <FacilityStaffPage />
    </RequirePermission>
  );
}

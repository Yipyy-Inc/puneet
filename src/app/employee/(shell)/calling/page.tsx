import CallingPage from "@/app/facility/dashboard/calling/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Section 5F — the same calling screen as admin, inside the /employee shell.
// view_calling (calling_view) not_granted → the nav item is absent and the URL
// is closed.
export default function EmployeeCallingPage() {
  return (
    <RequirePermission permKey="calling_view">
      <CallingPage />
    </RequirePermission>
  );
}

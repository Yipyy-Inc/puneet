import BoardingPage from "@/app/facility/dashboard/services/boarding/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

export default function EmployeeBoardingPage() {
  return (
    <RequirePermission permKey="boarding_view_dashboard">
      <BoardingPage />
    </RequirePermission>
  );
}

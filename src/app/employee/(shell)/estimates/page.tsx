import EstimatesPage from "@/app/facility/dashboard/estimates/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Estimates are booking quotes. Gated on view_bookings (the broadly-granted
// booking key reception carries); create_bookings would also fit if a stricter
// gate is wanted.
export default function EmployeeEstimatesPage() {
  return (
    <RequirePermission permKey="view_bookings">
      <EstimatesPage />
    </RequirePermission>
  );
}

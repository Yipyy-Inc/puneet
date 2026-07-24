import PetCamsPage from "@/app/facility/dashboard/petcams/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// No dedicated pet-cams key exists. Live cameras are a guest-monitoring surface,
// so we gate on the nearest broadly-granted operational key, view_bookings.
export default function EmployeePetCamsPage() {
  return (
    <RequirePermission permKey="view_bookings">
      <PetCamsPage />
    </RequirePermission>
  );
}

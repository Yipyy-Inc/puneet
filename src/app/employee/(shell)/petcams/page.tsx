import PetCamsPage from "@/app/facility/dashboard/petcams/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Live cameras are a guest-monitoring surface — gated on their dedicated
// per-feature key so the nav toggle and route access track together (4.1).
export default function EmployeePetCamsPage() {
  return (
    <RequirePermission permKey="view_petcams">
      <PetCamsPage />
    </RequirePermission>
  );
}

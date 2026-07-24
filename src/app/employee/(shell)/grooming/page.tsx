import GroomingPage from "@/app/facility/dashboard/services/grooming/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Reuses the real facility grooming module (the Check-In Board etc.) — NOT a
// separate "Grooming Queue" screen — gated on the same key the nav item uses.
// assigned_only viewers still reach it, scoped to their own work in the data
// layer (8B), exactly like /employee/bookings reuses the facility bookings page.
export default function EmployeeGroomingPage() {
  return (
    <RequirePermission permKey="view_grooming_queue">
      <GroomingPage />
    </RequirePermission>
  );
}

import { EmployeeGroomingModule } from "@/components/employee/EmployeeGroomingModule";
import { RequireAnyPermission } from "@/components/employee/AccessRestricted";

// Section 5A — /employee/grooming renders the SAME grooming module as admin
// (same tabs + components), gated per-key inside those shared components.
// Route-level gate mirrors the nav section's keys so the URL isn't reachable
// by staff who have no grooming access at all.
export default function EmployeeGroomingPage() {
  return (
    <RequireAnyPermission
      permKeys={[
        "view_grooming_queue",
        "grooming_view_own_calendar",
        "grooming_view_all_calendars",
      ]}
    >
      <EmployeeGroomingModule />
    </RequireAnyPermission>
  );
}

import IncidentsPage from "@/app/facility/dashboard/incidents/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Section 5G — the same Incident Reporting screen as admin, inside the
// /employee shell so the RBAC provider is active. view_incidents
// (ops_incidents_view) not_granted → the list is not reachable at all; the nav
// section is hidden by the same key. Inside the detail modal, the status
// dropdown + Close Incident require ops_incidents_manage.
export default function EmployeeIncidentsPage() {
  return (
    <RequirePermission permKey="ops_incidents_view">
      <IncidentsPage />
    </RequirePermission>
  );
}

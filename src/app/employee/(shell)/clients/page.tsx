import ClientsPage from "@/app/facility/dashboard/clients/page";
import { RequirePermission } from "@/components/employee/AccessRestricted";

// Section 5C — the same clients table as admin, gated on view_client_list:
// not_granted → <AccessRestricted/> (the nav already hides the section; this
// stops the URL being reachable directly). assigned_only → the list is scoped
// to the viewer's assigned clients in the data layer (8B).
export default function EmployeeClientsPage() {
  return (
    <RequirePermission permKey="view_client_list">
      <ClientsPage />
    </RequirePermission>
  );
}

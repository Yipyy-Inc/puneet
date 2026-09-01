import { CallingWorkspace } from "@/app/facility/dashboard/calling/_components/CallingWorkspace";
import { RequirePermission } from "@/components/employee/AccessRestricted";
import { callingSystemStatus } from "@/lib/calling/system-status";

// Section 5F — the same calling screen as admin, inside the /employee shell.
// view_calling (calling_view) not_granted → the nav item is absent and the URL
// is closed.
//
// ── WHY THIS IMPORTS THE WORKSPACE, NOT THE ROUTE ─────────────────────────
//
// It used to import the facility route's default export. That worked only
// while that route was itself a client component; the moment it became a
// Server Component reading `searchParams` — which is what makes `?tab=` work
// at all — this would have rendered a component expecting a promise it was
// never given. Importing the workspace directly removes the coupling instead
// of restating it.
export default function EmployeeCallingPage() {
  return (
    <RequirePermission permKey="calling_view">
      <CallingWorkspace systemStatus={callingSystemStatus()} />
    </RequirePermission>
  );
}

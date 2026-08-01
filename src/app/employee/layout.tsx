import { canAccessStaffPortal } from "@/lib/auth/viewer";
import { guardPortal } from "@/lib/auth/portal-gate";

// ============================================================================
// Employee portal — authentication.
//
// The (shell) layout below already refuses to render without an
// `employee_staff_id` cookie, but that is a "which staff member am I working
// as" check, not a "who are you" one: it is set by /employee/select, which was
// itself reachable by anyone. Picking an identity is not proving one.
//
// This sits above both, so /employee/select is covered too. No public prefixes
// — the employee portal has no auth screens of its own; staff sign in at
// /staff/auth/login or /login.
// ============================================================================

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await guardPortal({ portal: "staff", allow: canAccessStaffPortal });

  return <>{children}</>;
}

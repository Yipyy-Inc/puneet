import { canAccessStaffPortal } from "@/lib/auth/viewer";
import { guardPortal } from "@/lib/auth/portal-gate";
import { redirectIfStillOnboarding } from "@/lib/auth/onboarding-gate";

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
  const viewer = await guardPortal({ allow: canAccessStaffPortal });

  // ── WHY THIS MOVED HERE TOO (ADR 0005) ──────────────────────────────────
  //
  // The onboarding gate lived ONLY in the facility layout, which worked while
  // any member could reach /facility: an invited hire who went looking for the
  // dashboard was intercepted and sent to their checklist.
  //
  // Staff are now denied that portal outright, so the interception never
  // happened — and it never happened on the path they actually take either,
  // because signing in has always landed them on /employee/schedule, which had
  // no gate. So an invited hire simply started work: the checklist existed and
  // nothing routed anybody to it.
  //
  // Caught by tests/e2e/staff-invite-gate.spec.ts, whose assertion was written
  // against the accidental path rather than the real one.
  await redirectIfStillOnboarding(viewer.email);

  return <>{children}</>;
}

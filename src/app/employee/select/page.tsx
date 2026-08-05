import { redirect } from "next/navigation";

import { resolveEmployeeIdentity } from "@/lib/auth/employee-identity";
import { EmployeeSelectClient } from "./_client";

// ============================================================================
// "Who are you working as?" — a question only some callers should be asked.
//
// This picker predates real logins: it was how you got into the employee
// portal at all. Now that staff sign in as themselves, offering the list to
// someone whose session already names them is worse than redundant — it
// invites them to act under a colleague's name, and the shell would then show
// that colleague while the database kept answering with the picker's own
// permissions.
//
// So it is now for two callers only:
//
//   • someone SIGNED IN with no staff record — the mock-data case. (Signed out
//     is not one of these: that is a sign-in, not a choice, and it is handled
//     below rather than being offered a list of colleagues.)
//   • a PLATFORM ADMIN, for whom reviewing a facility as one of its staff is
//     what the tool is for.
//
// Everyone else goes straight in as themselves. `mayPick` is the same field
// the shell layout resolves from, so the redirect here and the seating there
// cannot drift apart — a redirect on one rule and a seat on another would be
// decoration.
// ============================================================================

export default async function EmployeeSelectPage() {
  const { staffId, mayPick } = await resolveEmployeeIdentity();

  if (!mayPick) {
    // The two reasons for refusing the picker need different destinations. A
    // session that already names you goes in; nobody at all signs in. Sending
    // both to /employee worked only because the shell there bounced the
    // signed-out case onward to /login — a second hop that existed purely
    // because this page did not distinguish them.
    redirect(staffId ? "/employee" : "/sign-in");
  }

  return <EmployeeSelectClient />;
}

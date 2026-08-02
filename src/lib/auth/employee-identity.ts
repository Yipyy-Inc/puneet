import "server-only";

import { cookies } from "next/headers";

import { getViewer } from "@/lib/auth/viewer";
import { legacyStaffIdForEmail } from "@/lib/auth/legacy-identity";

// ============================================================================
// Who is acting in the employee portal — asked once, answered in one place.
//
// The rule itself is short. It lives here because it was previously written
// out in the shell layout and then IGNORED by three of the pages inside that
// layout, each of which read the `employee_staff_id` cookie directly:
//
//   /employee            → cookie, falling back to `facilityStaff[0]`
//   /employee/register   → cookie
//   /employee/select     → half the rule (the redirect, not the resolution)
//
// So the shell could correctly seat a signed-in groomer while the page inside
// it greeted the first name in a mock array, and the till page opened the
// drawer under whoever the cookie last named. A rule that only one of four
// callers applies is not a rule.
//
// THE RULE: your session names you. The cookie only chooses when the session
// cannot answer — you have no staff record (the mock-data case, and every
// visitor while AUTH_ENFORCED omits `staff`), or you are a platform admin, for
// whom reviewing a facility as one of its staff is the point of the tool.
// ============================================================================

export interface EmployeeIdentity {
  /** The acting staff member's legacy id, or null when nobody is named. */
  staffId: string | null;
  /**
   * Whether the picker is legitimate for this caller. False means the session
   * names them and `/employee/select` should send them straight in — offering
   * the list would invite acting under a colleague's name while the database
   * keeps answering with the picker's own permissions.
   */
  mayPick: boolean;
}

export async function resolveEmployeeIdentity(): Promise<EmployeeIdentity> {
  const viewer = await getViewer();
  const sessionStaffId = await legacyStaffIdForEmail(viewer.email);
  const mayPick = sessionStaffId === null || viewer.isPlatformAdmin;

  if (!mayPick) return { staffId: sessionStaffId, mayPick };

  const cookieStore = await cookies();
  const pickedStaffId = cookieStore.get("employee_staff_id")?.value;

  return { staffId: pickedStaffId ?? sessionStaffId, mayPick };
}

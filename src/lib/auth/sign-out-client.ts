"use client";

import { signOut } from "@/lib/auth/actions";

// ============================================================================
// The one way to sign out of this app.
//
// Every portal had its own logout button and every one of them was a stub —
// `// TODO: Implement logout logic`, and in one case `console.log("Logout
// clicked")`. A logout that reports success without ending the session is
// worse than no logout at all: it is the button people press on a shared
// machine before walking away.
//
// Two halves, and both are required:
//   • the server action ends the Supabase session and clears the legacy
//     identity COOKIES (user_role, facility_role, employee_staff_id)
//   • this clears the legacy identity in localStorage, which the server
//     cannot touch and which the groomer/staff surfaces read to decide whose
//     schedule and clients to show
// ============================================================================

/** localStorage keys that identify a person. See lib/role-utils.ts. */
const LEGACY_IDENTITY_KEYS = [
  "facility_current_user_id",
  "scheduling-current-user-role",
];

export async function signOutEverywhere(): Promise<void> {
  if (typeof window !== "undefined") {
    for (const key of LEGACY_IDENTITY_KEYS) {
      localStorage.removeItem(key);
    }
    sessionStorage.removeItem("yipyy-employee-welcome-ts");
  }

  // Redirects to /login, so nothing after this runs.
  await signOut();
}

"use client";

// ============================================================================
// The one way to sign out of this app.
//
// Every portal had its own logout button and every one of them was a stub —
// `// TODO: Implement logout logic`, and in one case `console.log("Logout
// clicked")`. A logout that reports success without ending the session is
// worse than no logout at all: it is the button people press on a shared
// machine before walking away. That sentence is why this file throws below
// rather than returning quietly.
//
// Two halves, and both are required:
//   • Clerk ends the session — it owns it now, so there is no Supabase server
//     action to call and no auth cookie of ours to clear
//   • this clears the legacy identity in localStorage, which the server cannot
//     touch and which the groomer/staff surfaces read to decide whose schedule
//     and clients to show
//
// Kept as a plain async function rather than converted to `useClerk()`, so the
// eight call sites did not have to become hooks to change identity provider.
// ============================================================================

/** localStorage keys that identify a person. See lib/role-utils.ts. */
const LEGACY_IDENTITY_KEYS = [
  "facility_current_user_id",
  "scheduling-current-user-role",
];

/** The slice of clerk-js we use, typed so this file needs no `any`. */
type ClerkGlobal = {
  signOut: (options?: { redirectUrl?: string }) => Promise<void>;
};

export async function signOutEverywhere(): Promise<void> {
  if (typeof window === "undefined") return;

  for (const key of LEGACY_IDENTITY_KEYS) {
    localStorage.removeItem(key);
  }
  sessionStorage.removeItem("yipyy-employee-welcome-ts");

  const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;

  // clerk-js loads asynchronously under ClerkProvider. If a logout button is
  // somehow pressed before it lands, the session is still live — and silently
  // resolving here would clear the local identity, navigate away, and leave
  // that session open. That is precisely the failure this file exists to
  // prevent, so it fails loudly instead.
  if (!clerk) {
    throw new Error(
      "Sign-out was requested before Clerk finished loading; the session is " +
        "still open. Nothing was signed out.",
    );
  }

  // Redirects, so nothing after this runs.
  await clerk.signOut({ redirectUrl: "/sign-in" });
}

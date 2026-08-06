"use client";

import { useClerk } from "@clerk/nextjs";
import { useCallback } from "react";
import { toast } from "sonner";

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
//   • Clerk ends the session — it owns it now, so there is no Supabase server
//     action to call and no auth cookie of ours to clear
//   • this clears the legacy identity in localStorage, which the server cannot
//     touch and which the groomer/staff surfaces read to decide whose schedule
//     and clients to show
//
// WHY A HOOK, after this was briefly a plain function.
// The first cut reached for `window.Clerk` so the eight call sites would not
// have to become hooks. It shipped to production and logout did nothing: the
// global was not there when the handler ran, the function threw, and every
// call site wraps it in `void` — which turns a rejected promise into an
// unhandled rejection and a button that silently does nothing.
//
// `useClerk()` is the supported API. It resolves through ClerkProvider's
// context rather than a global that may or may not have been attached yet, so
// there is no timing window and nothing to guard against. Avoiding an eight-line
// diff was not worth a logout button that lies.
// ============================================================================

/** localStorage keys that identify a person. See lib/role-utils.ts. */
const LEGACY_IDENTITY_KEYS = [
  "facility_current_user_id",
  "scheduling-current-user-role",
];

/**
 * Returns the sign-out function. Name the result `signOutEverywhere` at the
 * call site and the existing `void signOutEverywhere()` handlers keep working
 * unchanged.
 */
export function useSignOutEverywhere(): () => Promise<void> {
  const { signOut } = useClerk();

  return useCallback(async () => {
    if (typeof window !== "undefined") {
      for (const key of LEGACY_IDENTITY_KEYS) {
        localStorage.removeItem(key);
      }
      sessionStorage.removeItem("yipyy-employee-welcome-ts");
    }

    // WHY THE NAVIGATION IS OURS AND NOT CLERK'S.
    // This previously passed `{ redirectUrl: "/sign-in" }` and trusted Clerk to
    // move the browser. It did not, and the symptom is indistinguishable from a
    // dead button: the session ends, the page stays put still rendering the
    // signed-in UI, and the person presses Logout again. Ending the session and
    // leaving someone looking at a logged-in screen is the exact failure this
    // file exists to prevent.
    //
    // So: end the session, then navigate ourselves, unconditionally.
    try {
      await signOut();
    } catch (error) {
      // Every call site wraps this in `void`, which turns a rejection into an
      // unhandled promise and shows the user nothing. Surface it here instead —
      // a logout that failed must say so, on a shared machine especially.
      toast.error("Could not sign you out. Please close this browser.");
      throw error;
    }

    if (typeof window !== "undefined") {
      // A hard navigation, not router.push: it discards every client-side cache
      // of the signed-out user — React state, Clerk's in-memory session, the
      // TanStack Query cache — rather than carrying them into the next page.
      window.location.href = "/sign-in";
    }
  }, [signOut]);
}

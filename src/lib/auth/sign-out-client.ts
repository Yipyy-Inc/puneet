"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { signOutAction } from "@/lib/auth/workos-actions";

// ============================================================================
// The one way to sign out of this app.
//
// Every portal had its own logout button and every one of them was a stub —
// `// TODO: Implement logout logic`, and in one case `console.log("Logout
// clicked")`. A logout that reports success without ending the session is worse
// than no logout at all: it is the button people press on a shared machine
// before walking away.
//
// Two halves, and both are required:
//   • the server action ends the WorkOS session — it owns it, so there is no
//     auth cookie of ours to clear
//   • this clears the legacy identity in localStorage, which the server cannot
//     touch and which the groomer/staff surfaces read to decide whose schedule
//     and clients to show
//
// WHY THE HOOK SHAPE SURVIVED THE PROVIDER CHANGE. It exists because an earlier
// cut reached for `window.Clerk` so the eight call sites would not have to become
// hooks. That shipped, and logout did nothing: the global was not there when the
// handler ran, the function threw, and every call site wraps it in `void` — which
// turns a rejected promise into an unhandled rejection and a button that silently
// does nothing. The hook is now trivial (a server action needs no context), but
// the signature is kept so those eight `void signOutEverywhere()` handlers, and
// the lesson, stay put.
// ============================================================================

/** localStorage keys that identify a person. See lib/role-utils.ts. */
const LEGACY_IDENTITY_KEYS = [
  "facility_current_user_id",
  "scheduling-current-user-role",
];

/**
 * Returns the sign-out function. Name the result `signOutEverywhere` at the call
 * site and the existing `void signOutEverywhere()` handlers keep working.
 */
export function useSignOutEverywhere(): () => Promise<void> {
  return useCallback(async () => {
    if (typeof window !== "undefined") {
      for (const key of LEGACY_IDENTITY_KEYS) {
        localStorage.removeItem(key);
      }
      sessionStorage.removeItem("yipyy-employee-welcome-ts");
    }

    try {
      await signOutAction();
    } catch (error) {
      // Every call site wraps this in `void`, which turns a rejection into an
      // unhandled promise and shows the user nothing. Surface it here instead —
      // a logout that failed must say so, on a shared machine especially.
      toast.error("Could not sign you out. Please close this browser.");
      throw error;
    }

    // A FALLBACK, not the normal path. `signOut()` redirects to the environment's
    // Logout URI, so control usually never reaches this line. It is here because
    // the failure this file exists to prevent — session ended, browser still
    // showing the signed-in page — is indistinguishable from a dead button, and
    // one unconditional navigation is cheap insurance against it.
    //
    // Hard navigation rather than router.push: it discards every client-side
    // cache of the signed-out user (React state, the TanStack Query cache)
    // instead of carrying them into the next page.
    if (typeof window !== "undefined") {
      window.location.href = "/sign-in";
    }
  }, []);
}

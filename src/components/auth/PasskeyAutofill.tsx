"use client";

import { useEffect } from "react";

import {
  signInWithPasskey,
  supportsPasskeyAutofill,
} from "@/lib/auth/passkey-client";

// ============================================================================
// The passkey offered inside the email field. Renders nothing, ever.
//
// This is the feature as it was actually asked for: "next time they can sign in
// using passkey and skip putting password using the biometrics or pin". No
// button — the user focuses the email box, their saved passkey is listed in the
// browser's own dropdown, they pick it, they do Face ID, they are in.
//
// It works because the field is marked `autocomplete="email webauthn"` (see
// EmailSignInForm) and because a CONDITIONAL WebAuthn request is in flight from
// the moment the page loads. Both halves are required; either alone does
// nothing, and neither fails visibly, which is why they are commented at both
// ends.
//
// ── THE PROMISE MAY NEVER RESOLVE, AND THAT IS NORMAL ─────────────────────
//
// A conditional request sits open until the user picks a passkey — which for
// most visits is never, because most visits are somebody typing a password. So
// nothing here may block rendering, and silence must never be reported as a
// failure. There is no error branch below for exactly that reason: a rejection
// means "they did something else", which is not news.
//
// ── AND IT MUST FAIL SILENTLY WHERE IT IS NOT SUPPORTED ───────────────────
//
// Firefox and older Safari have WebAuthn but not conditional UI. Calling
// startAuthentication with `useBrowserAutofill` there throws. The support check
// runs first, and PasskeySignInButton is what those browsers get instead.
// ============================================================================

export function PasskeyAutofill() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!(await supportsPasskeyAutofill())) return;
      if (cancelled) return;

      const result = await signInWithPasskey({ autofill: true });

      // Only success does anything. A cancellation or an error here means the
      // user went another way; the visible form owns telling them about that.
      if (!cancelled && "ok" in result) {
        // Full navigation, so the server sees the session cookie the verify
        // response just set. See PasskeySignInButton for the same reasoning.
        window.location.assign("/");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

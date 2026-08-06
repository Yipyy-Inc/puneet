"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useState } from "react";

import { Button } from "@/components/ui/button";

// ============================================================================
// The Google button — ours, not Clerk's.
//
// This replaced <SignIn />. The prebuilt widget draws its own card, heading and
// footer inside whatever you put it in, so the screen showed two nested cards,
// two sign-up links, and a "Secured by Clerk" line. Restyling it through the
// appearance prop fought those defaults instead of removing them.
//
// Clerk's hooks do the same job without any of the chrome: `signIn.sso()` hands
// off to Google and Clerk still owns the session, the tokens and the callback.
// What we own is a button. That is the right split — the credential handling is
// the part worth outsourcing, the brand is not.
//
// SIGN-IN AND SIGN-UP ARE THE SAME ACT HERE. With OAuth-only there is nothing
// to fill in: Google either recognises the account or creates it. `mode`
// changes which Clerk resource starts the flow and the button label, nothing
// else — so a returning user pressing "Create an account" still just signs in.
// ============================================================================

/** Google requires its own mark on sign-in buttons; this is the official 4-colour G. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.26-2.09 3.58-5.17 3.58-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  mode = "sign-in",
}: {
  mode?: "sign-in" | "sign-up";
}) {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setMessage(null);

    const resource = mode === "sign-up" ? signUp : signIn;
    if (!resource) {
      // Clerk has not finished loading. Saying so beats a dead button.
      setMessage("Still starting up — try again in a moment.");
      setPending(false);
      return;
    }

    const { error } = await resource.sso({
      strategy: "oauth_google",
      // Where to land afterwards. `/` redirects to /dashboard, whose gate calls
      // landingPathFor(viewer) — so the portal is chosen from the token rather
      // than guessed here. One sign-in serves every kind of account.
      redirectUrl: "/",
      redirectCallbackUrl: "/sso-callback",
    });

    // On success the browser has already left for Google, so only the failure
    // path runs here. Clearing `pending` on success would flash the button back
    // to normal mid-navigation.
    if (error) {
      setMessage(
        error.message ?? "Could not reach Google just now. Please try again.",
      );
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full font-medium"
        onClick={() => void start()}
        disabled={pending}
      >
        {pending ? (
          "Redirecting…"
        ) : (
          <>
            <GoogleMark />
            Continue with Google
          </>
        )}
      </Button>

      {message && (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {message}
        </p>
      )}
    </div>
  );
}

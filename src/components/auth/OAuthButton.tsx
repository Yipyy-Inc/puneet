"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  startOAuth,
  type SupportedOAuthProvider,
} from "@/lib/auth/workos-actions";

// ============================================================================
// The shared body of every social sign-in button — ours, not a vendor's.
//
// This replaced Clerk's <SignIn />, and the reasoning survived the move to
// WorkOS unchanged: a prebuilt widget draws its own card, heading and footer
// inside whatever you put it in, so the screen showed two nested cards, two
// sign-up links and a "Secured by" line. What we own is a button; the credential
// handling is the part worth outsourcing, the brand is not.
//
// SIGN-IN AND SIGN-UP ARE THE SAME ACT HERE. With OAuth there is nothing to fill
// in: the provider either recognises the account or creates it, and the label
// read "Continue with …" in both cases anyway.
//
// The `mode` prop these buttons used to take is GONE rather than ignored. Under
// Clerk it picked which resource began the flow; WorkOS has one authorization
// URL for both. Keeping a prop that no longer changes anything is how a codebase
// accumulates settings nobody can explain.
//
// THE REDIRECT HAPPENS ON THE SERVER. `startOAuth` sets the CSRF state cookie
// and then throws Next's redirect — which is why there is no success branch
// below and no `setPending(false)` on the happy path. If the action returns at
// all, it failed.
// ============================================================================

export function OAuthButton({
  provider,
  providerName,
  mark,
}: {
  provider: SupportedOAuthProvider;
  /** Shown to the user, and used in the failure message. */
  providerName: string;
  mark: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function start() {
    setMessage(null);
    startTransition(async () => {
      const result = await startOAuth(provider);
      // Only reached when the hand-off never happened; a success redirects.
      if (result?.error) setMessage(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full font-medium"
        onClick={start}
        disabled={pending}
      >
        {pending ? (
          "Redirecting…"
        ) : (
          <>
            {mark}
            Continue with {providerName}
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

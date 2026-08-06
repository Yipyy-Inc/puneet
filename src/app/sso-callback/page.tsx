import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/AuthCard";

export const metadata: Metadata = { title: "Signing you in — Yipyy" };

// ============================================================================
// Where Google sends people back to.
//
// `signIn.sso()` passes this path as `redirectCallbackUrl`. The component below
// finishes the handshake — reads the parameters Clerk put on the URL, creates
// the session, then forwards to the `redirectUrl` from the button ("/", which
// routes on to the right portal).
//
// It renders nothing of its own, so without the card around it this is a blank
// white flash between Google and the app. The card makes the pause look
// deliberate on a slow connection.
//
// Not linked from anywhere and not meant to be visited directly: opened without
// SSO parameters, Clerk simply returns the visitor to sign-in.
// ============================================================================

export default function SsoCallbackPage() {
  return (
    <AuthCard title="Signing you in" description="One moment…">
      <div className="flex justify-center py-2">
        <div
          className="border-muted-foreground/30 border-t-primary size-6 animate-spin rounded-full border-2"
          role="status"
          aria-label="Signing in"
        />
      </div>
      <AuthenticateWithRedirectCallback />
    </AuthCard>
  );
}

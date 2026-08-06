import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/AuthCard";
import { EmailSignInForm } from "@/components/auth/EmailSignInForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const metadata: Metadata = { title: "Sign in — Yipyy" };

// ============================================================================
// The canonical sign-in, and the one every portal gate redirects to.
//
// Deliberately portal-neutral: it does not ask who you are. The token is read
// afterwards and routes accordingly (see landingPathForClaims). One person may
// be a groomer at one facility and an owner at another; asking them to pick a
// portal before signing in asks a question they should not have to answer.
//
// No Clerk component is rendered here — see GoogleSignInButton for why. The
// whole screen is Yipyy's markup; Clerk is the mechanism behind the button.
//
// A Server Component; only the button carries a client boundary.
// ============================================================================

export default function SignInPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Use your Yipyy account — we'll take you to the right place."
      footer={
        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="text-primary font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      }
    >
      <EmailSignInForm />

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <GoogleSignInButton mode="sign-in" />
    </AuthCard>
  );
}

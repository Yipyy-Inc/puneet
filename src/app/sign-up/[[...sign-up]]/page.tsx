import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/AuthCard";
import { EmailSignUpForm } from "@/components/auth/EmailSignUpForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export const metadata: Metadata = { title: "Create an account — Yipyy" };

// ============================================================================
// Sign-up. Counterpart to ../sign-in; see GoogleSignInButton for why neither
// screen renders a Clerk component.
//
// With OAuth-only there is nothing to fill in, so this differs from sign-in
// only in wording and in which Clerk resource starts the flow. Someone who
// already has an account and presses the button here still just signs in.
//
// A new account exists in Clerk immediately, but its `profiles` row arrives via
// the sync webhook (src/app/api/webhooks/clerk/route.ts), which is
// asynchronous. So a brand-new user can land signed in with no memberships and
// be refused by every portal gate for a moment. That is expected: membership is
// a grant an admin makes, never a consequence of filling in a form.
// ============================================================================

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your account"
      description="One account for booking, your pets and your visits."
      footer={
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <EmailSignUpForm />

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <GoogleSignInButton mode="sign-up" />
    </AuthCard>
  );
}

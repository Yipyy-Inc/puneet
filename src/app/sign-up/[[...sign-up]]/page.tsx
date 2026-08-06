import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/AuthCard";
import { yipyyClerkAppearance } from "@/components/auth/clerk-appearance";

export const metadata: Metadata = { title: "Create an account — Yipyy" };

// ============================================================================
// Sign-up. Counterpart to ../sign-in; see that file for why the page chrome is
// ours and only the credential controls are Clerk's.
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
      <SignUp appearance={yipyyClerkAppearance} />
    </AuthCard>
  );
}

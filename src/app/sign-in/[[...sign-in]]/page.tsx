import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/AuthCard";
import { yipyyClerkAppearance } from "@/components/auth/clerk-appearance";

export const metadata: Metadata = { title: "Sign in — Yipyy" };

// ============================================================================
// The canonical sign-in, and the one every portal gate redirects to.
//
// Deliberately portal-neutral: it does not ask who you are. The token is read
// afterwards and routes accordingly (see landingPathForClaims). One person may
// be a groomer at one facility and an owner at another; asking them to pick a
// portal before signing in asks a question they should not have to answer.
//
// The page is ours and the credentials are Clerk's. AuthCard draws the
// gradient, the wordmark, the heading and the footer link — the same shell the
// pre-Clerk login used — and Clerk renders only the provider buttons inside it.
// That split is why swapping identity provider did not cost the brand.
//
// A Server Component; <SignIn /> carries its own client boundary.
// ============================================================================

export default function SignInPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Use your Yipyy account — we'll take you to the right place."
      footer={
        <p className="text-muted-foreground text-center text-sm">
          Booking as a pet owner?{" "}
          <Link
            href="/sign-up"
            className="text-primary font-medium hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <SignIn appearance={yipyyClerkAppearance} />
    </AuthCard>
  );
}

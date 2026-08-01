import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign in — Yipyy" };

// ============================================================================
// Pet-owner sign-in.
//
// Now a Server Component: the page reads its params on the server and only the
// form hydrates. It used to be "use client" purely to call useSearchParams,
// which cost the whole page a client bundle for two query strings.
//
// "Continue with Google" used to sit above this form. It called a stub that
// returned a hardcoded user@example.com and pushed you into signup as that
// fake person. Re-enabling it for real means turning Google on under
// Authentication > Providers, an action calling signInWithOAuth, and pointing
// it at /auth/callback — which now exists.
// ============================================================================

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ facility?: string; redirect?: string }>;
}) {
  const { facility, redirect } = await searchParams;

  const signupHref = facility
    ? `/customer/auth/signup?facility=${encodeURIComponent(facility)}`
    : "/customer/auth/signup";

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your account to continue"
    >
      <SignInForm
        // Honour "you were sent here from X", otherwise the customer area.
        // Validated server-side in the action — this is only a suggestion.
        redirectTo={redirect ?? "/customer/dashboard"}
        forgotHref="/customer/auth/forgot-password"
        footer={
          <p className="text-muted-foreground text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href={signupHref}
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        }
      />
    </AuthCard>
  );
}

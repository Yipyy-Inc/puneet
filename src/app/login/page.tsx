import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign in — Yipyy" };

// ============================================================================
// The canonical sign-in, and the one every portal gate redirects to.
//
// It exists because the portals it protects — facility admin, the platform
// dashboard, the employee schedule — had no login page at all. Denied users
// were being sent to the *customer* login, which works but is the wrong front
// door and cannot explain itself.
//
// Deliberately portal-neutral: it does not ask who you are, it reads the token
// afterwards and routes accordingly (see landingPathForClaims). One person may
// be a groomer at one facility and an owner at another; asking them to pick a
// portal before signing in asks a question they should not have to answer.
//
// A Server Component — only the form inside is interactive.
// ============================================================================

/** Supabase's own link failures arrive here as prose; keep them readable. */
function LinkProblem({ reason }: { reason: string }) {
  return (
    <p
      role="alert"
      className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
    >
      {reason}
    </p>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; next?: string }>;
}) {
  const params = await searchParams;

  const initialMessage = params.error ? (
    <LinkProblem reason={params.error} />
  ) : params.reset ? (
    <p
      role="status"
      className="rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
    >
      Your password has been updated. Sign in with it below.
    </p>
  ) : null;

  return (
    <AuthCard
      title="Sign in"
      description="Use your Yipyy account — we'll take you to the right place."
    >
      <SignInForm
        // No redirectTo: the server picks the portal from the token.
        redirectTo={params.next}
        forgotHref="/customer/auth/forgot-password"
        initialMessage={initialMessage}
        footer={
          <p className="text-muted-foreground text-center text-sm">
            Booking as a pet owner?{" "}
            <Link
              href="/customer/auth/signup"
              className="text-primary font-medium hover:underline"
            >
              Create an account
            </Link>
          </p>
        }
      />
    </AuthCard>
  );
}

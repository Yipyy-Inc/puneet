import type { Metadata } from "next";
import { Scissors } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Groomer sign in — Yipyy" };

// ============================================================================
// Groomer sign-in.
//
// This page used to look the caller up in the `stylists` mock array and then
// accept ANY non-empty password — a comment said "For now, accept any password
// for demo purposes". Anyone who knew a groomer's email address was that
// groomer. It now goes through the same Supabase sign-in as every other portal.
//
// A groomer reaches their dashboard because their membership role says so
// (landingPathForClaims), not because they used this URL — so a caretaker who
// signs in here still lands on the employee schedule rather than a dashboard
// built for someone else's job.
// ============================================================================

export default function GroomerLoginPage() {
  return (
    <AuthCard
      title="Groomer Login"
      description="Sign in to access your grooming dashboard"
      brand={
        <div className="flex size-16 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-rose-500">
          <Scissors className="size-8 text-white" />
        </div>
      }
    >
      <SignInForm forgotHref="/groomer/auth/forgot-password" />
    </AuthCard>
  );
}

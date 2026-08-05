import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign up with Clerk — Yipyy" };

// ============================================================================
// The Clerk sign-up surface. Counterpart to ../sign-in; see that file for why
// this lives alongside the existing Supabase login rather than replacing it.
//
// A new user created here exists in CLERK ONLY until the sync webhook is
// pointed at a destination — they will have no profiles row, no
// facility_memberships row, and therefore no access to anything the app gates.
// That is expected at this stage, not a bug to work around by loosening RLS.
// ============================================================================

export default function ClerkSignUpPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <SignUp />
    </div>
  );
}

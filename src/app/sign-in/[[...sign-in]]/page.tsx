import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in with Clerk — Yipyy" };

// ============================================================================
// The Clerk sign-in surface. This is where Google and Apple appear.
//
// Deliberately a SEPARATE route from /login rather than a replacement for it.
// /login is still the canonical door: it drives Supabase Auth, which still owns
// every session the app actually authorises against (55 auth.uid() call sites
// across the RLS layer). Swapping /login over to Clerk before that layer can
// read a Clerk identity would sign people in successfully and then show them
// empty pages, which is the worst of both.
//
// Google and Apple are not configured here. Clerk renders whichever social
// providers are enabled on the instance, so they are turned on in the Clerk
// dashboard (User & Authentication > Social Connections) and this file does not
// change. That is why there is no per-provider button code below.
//
// A Server Component — <SignIn /> is a client component internally and carries
// its own boundary.
// ============================================================================

export default function ClerkSignInPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <SignIn />
    </div>
  );
}

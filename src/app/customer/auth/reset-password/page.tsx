import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthCard } from "@/components/auth/AuthCard";
import { getCurrentUser } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./_client";

export const metadata: Metadata = { title: "Reset password — Yipyy" };

// This page's entire job is asking "is there a recovery session?", so it can
// never be prerendered. Without this Next tries to build it statically and the
// build fails wherever Supabase env vars are absent — which is exactly what
// happened in CI while passing locally off .env.local.
//
// The rule generalises: any page that reads the session needs this. Layouts
// get away without it because getViewer swallows a missing-config error and
// falls through to the legacy path; getCurrentUser deliberately does not.
export const dynamic = "force-dynamic";

// ============================================================================
// Set a new password after following a recovery link.
//
// The old version read a `?token=` param and validated it against a stub that
// resolved after 500ms — every link looked valid, and no link did anything.
//
// The real flow does not put a token on this page at all. /auth/callback
// exchanges the emailed code for a session first and then sends the browser
// here; possession of that session IS the proof. So the check below is simply
// "is anyone signed in" — if the link expired, was already used, or someone
// navigated here directly, there is no session and we say so plainly rather
// than showing a form that cannot work.
// ============================================================================

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AuthCard
        title="Invalid reset link"
        description="This password reset link has expired, was already used, or was opened out of order."
      >
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
          Reset links work once and last one hour. Request a fresh one and open
          it in the same browser.
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/customer/auth/forgot-password">
              Request new reset link
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login">
              <ArrowLeft className="mr-2 size-4" />
              Back to sign in
            </Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description={`Choose a new password for ${user.email}`}
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}

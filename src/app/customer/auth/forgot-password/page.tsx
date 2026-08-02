"use client";

import { AuthCard } from "@/components/auth/AuthCard";
import {
  ForgotPasswordForm,
  ResetLinkSent,
} from "@/components/auth/ForgotPasswordForm";

// ============================================================================
// Request a password reset link.
//
// The old version showed a "Check your email" screen after a stub that slept
// for a second — convincing, and completely inert. It now really asks Supabase
// to send a recovery mail, pointed at /auth/callback so the link arrives with a
// session attached.
//
// The response is identical whether or not the address has an account, and
// deliberately so: a page that says "no account with that email" is a free
// tool for working out who your customers are.
// ============================================================================

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot password?"
      description="Enter your email address and we'll send you a link to reset your password"
    >
      <ForgotPasswordForm redirectTo="/customer/auth/reset-password">
        {(message) => <ResetLinkSent message={message} />}
      </ForgotPasswordForm>
    </AuthCard>
  );
}

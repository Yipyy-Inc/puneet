"use client";

import { Scissors } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import {
  ForgotPasswordForm,
  ResetLinkSent,
} from "@/components/auth/ForgotPasswordForm";

// ============================================================================
// Groomer password reset — the same real flow as everywhere else, with the
// grooming mark on it. Previously a stub that slept a second and then claimed
// an email had been sent.
// ============================================================================

export default function GroomerForgotPasswordPage() {
  return (
    <AuthCard
      title="Forgot password?"
      description="We'll email you a link to set a new one"
      brand={
        <div className="flex size-16 items-center justify-center rounded-full bg-linear-to-br from-pink-500 to-rose-500">
          <Scissors className="size-8 text-white" />
        </div>
      }
    >
      <ForgotPasswordForm
        redirectTo="/customer/auth/reset-password"
        backHref="/groomer/auth/login"
      >
        {(message) => (
          <ResetLinkSent message={message} backHref="/groomer/auth/login" />
        )}
      </ForgotPasswordForm>
    </AuthCard>
  );
}

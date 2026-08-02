"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import {
  AuthMessage,
  PasswordField,
  SubmitButton,
} from "@/components/auth/AuthFormParts";
import { changePassword } from "@/lib/auth/actions";
import { AUTH_INITIAL_STATE } from "@/lib/auth/form-state";

// ============================================================================
// Change your password while signed in.
//
// Distinct from the reset flow in one way that matters: this one demands the
// CURRENT password. The action verifies it by re-authenticating before
// changing anything, because otherwise a borrowed session — an unlocked
// laptop, a copied cookie — could be turned into permanent ownership of the
// account in two clicks.
// ============================================================================

export default function ChangePasswordPage() {
  const [state, formAction] = useActionState(
    changePassword,
    AUTH_INITIAL_STATE,
  );

  return (
    <AuthCard
      title="Change password"
      description="Update your account password"
    >
      <form action={formAction} className="space-y-4">
        <AuthMessage state={state} />

        <PasswordField
          id="currentPassword"
          label="Current password"
          autoComplete="current-password"
          invalid={Boolean(state.error)}
        />
        <PasswordField
          id="password"
          label="New password"
          autoComplete="new-password"
          invalid={Boolean(state.error)}
        />
        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          invalid={Boolean(state.error)}
        />

        <p className="text-muted-foreground text-xs">
          At least 12 characters, and different from your current one.
        </p>

        <SubmitButton pendingLabel="Changing password...">
          Change password
        </SubmitButton>
      </form>

      <div className="text-center">
        <Link
          href="/customer/dashboard"
          className="text-primary inline-flex items-center text-sm hover:underline"
        >
          <ArrowLeft className="mr-1 size-3" />
          Back to dashboard
        </Link>
      </div>
    </AuthCard>
  );
}

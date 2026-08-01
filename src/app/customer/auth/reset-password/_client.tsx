"use client";

import { useActionState } from "react";

import {
  AuthMessage,
  PasswordField,
  SubmitButton,
} from "@/components/auth/AuthFormParts";
import { updatePassword } from "@/lib/auth/actions";
import { AUTH_INITIAL_STATE } from "@/lib/auth/form-state";

/**
 * The only interactive part of the reset page — split out so the page itself
 * stays a Server Component and can check for a session before rendering a form
 * that would otherwise be unusable.
 */
export function ResetPasswordForm() {
  const [state, formAction] = useActionState(
    updatePassword,
    AUTH_INITIAL_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      <AuthMessage state={state} />

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
        At least 12 characters. Longer beats complicated.
      </p>

      <SubmitButton pendingLabel="Resetting password...">
        Reset password
      </SubmitButton>
    </form>
  );
}

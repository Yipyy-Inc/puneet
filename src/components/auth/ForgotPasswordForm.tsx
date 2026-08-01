"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth/actions";
import { AUTH_INITIAL_STATE } from "@/lib/auth/form-state";
import { AuthMessage, SubmitButton } from "./AuthFormParts";

/**
 * Shared by every portal's "forgot password" screen.
 *
 * `onSent` lets the page swap to its own confirmation view — the form owns the
 * submission, the page owns the layout around it.
 */
export function ForgotPasswordForm({
  redirectTo,
  backHref = "/login",
  children,
}: {
  /** Where the emailed link should land after the callback exchanges it. */
  redirectTo?: string;
  backHref?: string;
  /** Rendered instead of the form once the request succeeds. */
  children?: (message: string) => React.ReactNode;
}) {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    AUTH_INITIAL_STATE,
  );

  if (state.success && children) return <>{children(state.success)}</>;

  return (
    <>
      <form action={formAction} className="space-y-4">
        <AuthMessage state={state} />

        {redirectTo && (
          <input type="hidden" name="redirectTo" value={redirectTo} />
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="pl-9"
            />
          </div>
        </div>

        <SubmitButton pendingLabel="Sending...">
          <Mail className="mr-2 size-4" />
          Send reset link
        </SubmitButton>
      </form>

      <div className="text-center">
        <Link
          href={backHref}
          className="text-primary inline-flex items-center text-sm hover:underline"
        >
          <ArrowLeft className="mr-1 size-3" />
          Back to sign in
        </Link>
      </div>
    </>
  );
}

/** The "we've sent it" panel — identical wording wherever it appears. */
export function ResetLinkSent({
  message,
  backHref = "/login",
}: {
  message: string;
  backHref?: string;
}) {
  return (
    <>
      <p role="status" className="text-muted-foreground text-center text-sm">
        {message}
      </p>
      <div className="bg-muted text-muted-foreground rounded-lg p-4 text-sm">
        <p className="mb-2">
          The link is valid for one hour and can only be used once.
        </p>
        <p>Didn&apos;t receive it? Check your spam folder, then try again.</p>
      </div>
      <Link
        href={backHref}
        className="text-primary inline-flex w-full items-center justify-center text-sm hover:underline"
      >
        <ArrowLeft className="mr-1 size-3" />
        Back to sign in
      </Link>
    </>
  );
}

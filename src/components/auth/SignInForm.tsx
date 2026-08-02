"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/actions";
import { AUTH_INITIAL_STATE } from "@/lib/auth/form-state";
import { AuthMessage, PasswordField, SubmitButton } from "./AuthFormParts";

// ============================================================================
// The one sign-in form. Every portal renders this; only the branding and the
// post-login destination differ.
//
// Four portals previously had four different login implementations — one real,
// one that accepted any password for a known email, one that looked users up
// in a mock array, and one that did not exist. Sharing the form is what stops
// that happening again: a fix to the real one cannot miss the others.
// ============================================================================

export function SignInForm({
  redirectTo,
  forgotHref,
  /** Rendered under the form — sign-up prompts, demo hints, portal switches. */
  footer,
  /** Server-side message from a redirect, e.g. an expired link on /login. */
  initialMessage,
}: {
  /** Omit to let the server route by role — admin, facility, groomer, staff. */
  redirectTo?: string;
  forgotHref: string;
  footer?: React.ReactNode;
  initialMessage?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(signIn, AUTH_INITIAL_STATE);

  return (
    <>
      <form action={formAction} className="space-y-4">
        {redirectTo && (
          <input type="hidden" name="redirectTo" value={redirectTo} />
        )}

        {/* The action's own result supersedes whatever brought us here. */}
        {state.error || state.success ? (
          <AuthMessage state={state} />
        ) : (
          initialMessage
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
              aria-invalid={state.error ? "true" : "false"}
            />
          </div>
        </div>

        <PasswordField
          id="password"
          autoComplete="current-password"
          invalid={Boolean(state.error)}
          label={
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href={forgotHref}
                className="text-primary text-sm hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          }
        />

        <SubmitButton pendingLabel="Signing in...">Sign in</SubmitButton>
      </form>

      {footer}
    </>
  );
}

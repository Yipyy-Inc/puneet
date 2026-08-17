"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { resetPassword } from "@/lib/auth/workos-actions";

// ============================================================================
// The second half of "forgot password", which under Clerk lived inside
// EmailSignInForm as two more steps of its state machine.
//
// It moved because the mechanism changed: Clerk emailed a six-digit CODE that
// was typed back into the sign-in form, WorkOS emails a LINK carrying a
// single-use token. A token in the URL cannot be typed into the previous page,
// so the flow has a route of its own — and a token long enough to be unguessable
// beats a code short enough to be brute-forced.
//
// THE TOKEN IS NEVER PUT IN COMPONENT STATE OR LOGGED. It arrives as a prop from
// the server component that read the query string, goes straight back to the
// server action, and is single-use at WorkOS.
// ============================================================================

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== password;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setMessage(null);
    startTransition(async () => {
      const result = await resetPassword(token, password);
      // Success redirects to /sign-in?reset=1 and never returns.
      if (result?.error) setMessage(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-muted-foreground text-xs">
          At least 8 characters, and not a password known to have been breached.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {mismatch && (
          <p className="text-destructive text-xs">
            Those two passwords do not match.
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="h-11 w-full"
        disabled={pending || mismatch}
      >
        {pending ? "Saving…" : "Set new password"}
      </Button>

      {message && (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {message}
        </p>
      )}
    </form>
  );
}

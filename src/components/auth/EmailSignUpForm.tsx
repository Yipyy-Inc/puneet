"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { signUpWithPassword, verifyEmailCode } from "@/lib/auth/workos-actions";

// ============================================================================
// Email + password sign-up, with the email verification step that has to come
// before the account is usable.
//
//   details ──code sent──▶ verify ──▶ /
//
// THE VERIFY STEP IS NOT OPTIONAL, and it is load-bearing beyond the identity
// provider. The sync webhook writes `profiles.email`, which is NOT NULL — an
// unverified address would produce an account that exists in WorkOS and nowhere
// else, and its owner would be refused by every portal gate with nothing to
// explain why.
//
// The name fields are collected here rather than left for later because the
// webhook maps them straight to `profiles.full_name`; without them the facility
// staff lists show an email address where a person's name should be. They are
// `required` here AND required on the WorkOS environment, so a name cannot be
// skipped by posting around this form.
//
// THERE IS NO USERNAME, deliberately and at both ends. The account is identified
// by its email address — the same address `profiles.email` stores NOT NULL, and
// the same one `link_client_record()` matches a customer to their existing
// client row by. One identifier, one place it can be wrong.
//
// SIGN-UP DELEGATES TO SIGN-IN. Creating the user and then authenticating is one
// code path rather than two, so "new account" and "returning but unverified"
// cannot drift apart — both arrive at the same verify step below.
// ============================================================================

type Step = "details" | "verify";

export function EmailSignUpForm() {
  const [step, setStep] = useState<Step>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await signUpWithPassword(
        firstName,
        lastName,
        email,
        password,
      );
      if (result?.needsVerification) {
        setNotice(`We've sent a verification code to ${email.trim()}.`);
        setStep("verify");
        return;
      }
      if (result?.error) setMessage(result.error);
      // No else: a verified-on-creation account signs straight in on the server.
    });
  }

  function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await verifyEmailCode(code);
      if (result?.error) setMessage(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {notice && (
        <p
          role="status"
          className="rounded-md border border-emerald-600/40 bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
        >
          {notice}
        </p>
      )}

      {step === "details" && (
        <form onSubmit={submitDetails} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <PasswordInput
              id="signup-password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              At least 8 characters, and not a password known to have been
              breached.
            </p>
          </div>

          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={submitCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-code">Verification code</Label>
            <Input
              id="signup-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? "Verifying…" : "Verify and continue"}
          </Button>
        </form>
      )}

      {message && (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {message}
        </p>
      )}
    </div>
  );
}

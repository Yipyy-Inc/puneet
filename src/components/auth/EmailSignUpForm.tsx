"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

// ============================================================================
// Email + password sign-up, with the email verification step Clerk requires
// before the account becomes usable.
//
// Two steps, not one:
//
//   details ──code sent──▶ verify ──▶ finalize() ──▶ /
//
// THE VERIFY STEP IS NOT OPTIONAL, and it is load-bearing beyond Clerk. The
// sync webhook writes `profiles.email`, which is NOT NULL — an unverified
// address would produce an account that exists in Clerk and nowhere else, and
// its owner would be refused by every portal gate with nothing to explain why.
//
// The name fields are collected here rather than left for later because the
// webhook maps them straight to `profiles.full_name`; without them the facility
// staff lists show an email address where a person's name should be.
// ============================================================================

type Step = "details" | "verify";

export function EmailSignUpForm() {
  const { signUp } = useSignUp();
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(fn: () => Promise<{ error: unknown } | void>) {
    setPending(true);
    setMessage(null);
    try {
      const result = await fn();
      const err = result && "error" in result ? result.error : null;
      if (err) {
        // ClerkError.message is documented as developer-facing and not
        // stable; longMessage is the one meant to be shown to a user.
        const e = err as { longMessage?: string; message?: string };
        setMessage(
          e.longMessage ?? e.message ?? "That didn't work. Please try again.",
        );
        return false;
      }
      return true;
    } finally {
      setPending(false);
    }
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) {
      setMessage(
        "Sign-in is still starting up. Give it a moment and try again.",
      );
      return;
    }
    const ok = await run(async () => {
      const created = await signUp.password({
        emailAddress: email.trim(),
        password,
        username: username.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      if (created.error) return created;
      return signUp.verifications.sendEmailCode();
    });
    if (ok) {
      setNotice(`We've sent a verification code to ${email.trim()}.`);
      setStep("verify");
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!signUp) {
      setMessage(
        "Sign-in is still starting up. Give it a moment and try again.",
      );
      return;
    }
    const ok = await run(() =>
      signUp.verifications.verifyEmailCode({ code: code.trim() }),
    );
    if (!ok) return;

    await signUp.finalize({
      navigate: async ({ decorateUrl }) => {
        const url = decorateUrl("/");
        // decorateUrl may return an absolute URL to satisfy Safari's ITP.
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
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
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-username">Username</Label>
            <Input
              id="signup-username"
              autoComplete="username"
              required
              minLength={4}
              maxLength={64}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="how you'll sign in"
            />
            <p className="text-muted-foreground text-xs">
              4–64 characters. You can sign in with this or your email.
            </p>
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
              At least 8 characters.
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

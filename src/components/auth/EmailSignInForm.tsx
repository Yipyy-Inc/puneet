"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ============================================================================
// Email + password sign-in, and the password reset that has to come with it.
//
// Built on Clerk's hooks rather than <SignIn />, for the same reason as the
// Google button: the prebuilt widget brings its own card, headings and footer,
// and this screen is Yipyy's.
//
// A password system is not one form. Offering passwords means owning the reset
// path too, or the first person who forgets one is stuck with no way back in
// and no way to tell you. So this component is a small state machine:
//
//   credentials ──forgot──────▶ reset-code ──▶ reset-password ──▶ done
//        │
//        ├──new device─────────▶ client-trust ──▶ finalize()
//        └──known device───────▶ finalize()
//
// THE IDENTIFIER IS A USERNAME **OR** AN EMAIL. Clerk accepts either, so the
// field is deliberately `type="text"` — `type="email"` would make the browser
// reject a username as malformed before Clerk ever saw it.
//
// An email address is still mandatory on every account, even when someone signs
// in by username: `profiles.email` is NOT NULL, the sync webhook skips a user
// without one, and `link_client_record()` matches a customer to their existing
// client row by email. An account with no address would be created in Clerk,
// never get a profiles row, and be refused by every portal gate with nothing
// explaining why. The database decides that, not Clerk.
// ============================================================================

type Step = "credentials" | "client-trust" | "reset-code" | "reset-password";

export function EmailSignInForm() {
  const { signIn } = useSignIn();
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Hand the session over and let `/` route on to the right portal.
   *
   * GUARDED, because finalize() throws "Cannot finalize sign-in without a
   * created session" whenever the status is anything but `complete` — and that
   * throw escaped as an unhandled page error, leaving the user on the form with
   * an EMPTY red box. Calling it optimistically and hoping the status is right
   * is what produced a sign-in button that appeared to do nothing.
   *
   * Anything unhandled reports its status rather than failing mutely, so the
   * next unknown step is a legible bug report instead of a blank screen.
   */
  async function finish() {
    if (!signIn) return;

    if (signIn.status !== "complete") {
      setMessage(
        `Sign-in needs a further step this screen does not handle yet ` +
          `(status: ${String(signIn.status)}). Please tell support.`,
      );
      return;
    }

    await signIn.finalize({
      navigate: async ({ decorateUrl }) => {
        const url = decorateUrl("/");
        // decorateUrl may return an absolute URL to satisfy Safari's ITP.
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
  }

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

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) {
      setMessage(
        "Sign-in is still starting up. Give it a moment and try again.",
      );
      return;
    }
    const ok = await run(() =>
      signIn.password({ identifier: email.trim(), password }),
    );
    if (!ok) return;

    // A correct password is not always the end of it. Client Trust is enabled
    // on this instance, so signing in from an unrecognised device leaves the
    // status at `needs_client_trust` and Clerk expects a code before it will
    // issue a session. Calling finalize() here instead would appear to succeed
    // and leave the person on the form with no session and no explanation —
    // and since practically every FIRST sign-in is from a new device, that
    // would be almost everyone.
    if (
      signIn.status === "needs_client_trust" ||
      signIn.status === "needs_second_factor"
    ) {
      const sent = await run(() => signIn.mfa.sendEmailCode());
      if (sent) {
        setNotice("New device — we've emailed you a code to confirm it's you.");
        setStep("client-trust");
      }
      return;
    }

    await finish();
  }

  async function submitClientTrustCode(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) {
      setMessage(
        "Sign-in is still starting up. Give it a moment and try again.",
      );
      return;
    }
    const ok = await run(() =>
      signIn.mfa.verifyEmailCode({ code: code.trim() }),
    );
    if (ok) await finish();
  }

  async function startReset() {
    if (!signIn) {
      setMessage(
        "Sign-in is still starting up. Give it a moment and try again.",
      );
      return;
    }
    if (!email.trim()) {
      setMessage(
        "Enter your username or email first, then choose Forgot password.",
      );
      return;
    }
    // The reset code goes to the address on the account, so the sign-in has to
    // know which account it is before a code can be sent.
    const ok = await run(async () => {
      const created = await signIn.create({ identifier: email.trim() });
      if (created.error) return created;
      return signIn.resetPasswordEmailCode.sendCode();
    });
    if (ok) {
      setNotice(
        "We've sent a reset code to the email address on that account.",
      );
      setStep("reset-code");
    }
  }

  async function submitResetCode(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) {
      setMessage(
        "Sign-in is still starting up. Give it a moment and try again.",
      );
      return;
    }
    const ok = await run(() =>
      signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() }),
    );
    if (ok) {
      setNotice("Code accepted. Choose a new password.");
      setStep("reset-password");
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) {
      setMessage(
        "Sign-in is still starting up. Give it a moment and try again.",
      );
      return;
    }
    const ok = await run(() =>
      signIn.resetPasswordEmailCode.submitPassword({ password: newPassword }),
    );
    if (ok) await finish();
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

      {step === "credentials" && (
        <form onSubmit={submitCredentials} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Username or email</Label>
            <Input
              id="identifier"
              // `type="text"`, not `email`: the browser would reject a username
              // as malformed and block the submit before Clerk ever sees it.
              type="text"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => void startReset()}
                className="text-primary text-sm font-medium hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      )}

      {step === "client-trust" && (
        <form onSubmit={submitClientTrustCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trust-code">Confirmation code</Label>
            <Input
              id="trust-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? "Confirming…" : "Confirm this device"}
          </Button>
        </form>
      )}

      {step === "reset-code" && (
        <form onSubmit={submitResetCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Reset code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? "Checking…" : "Continue"}
          </Button>
        </form>
      )}

      {step === "reset-password" && (
        <form onSubmit={submitNewPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? "Saving…" : "Set new password and sign in"}
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

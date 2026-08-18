"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  sendPasswordReset,
  signInWithPassword,
  verifyEmailCode,
} from "@/lib/auth/workos-actions";

// ============================================================================
// Email + password sign-in, and the two things a password system cannot ship
// without: a way back in when you forget it, and a way through when the address
// has never been confirmed.
//
//   credentials ──unverified──▶ verify ──▶ /
//        │
//        ├──forgot────────────▶ reset-sent  (email carries a link, not a code)
//        └──ok────────────────▶ /
//
// THE IDENTIFIER IS AN EMAIL ADDRESS, and only that. It briefly accepted a
// username under Clerk, which is why this field used to be `type="text"`.
// Usernames are gone at both ends now, so the browser's own validation is back.
//
// WHAT CHANGED WITH WORKOS, and it is visible to users: Clerk's reset flow
// emailed a numeric CODE that was typed back into this form. WorkOS emails a
// LINK carrying a single-use token, so the last two steps of the old state
// machine moved to /reset-password, which reads that token from the URL. Fewer
// steps here, one more route — and no way to brute-force a six-digit code.
//
// THE DEVICE-TRUST STEP IS GONE. Clerk interposed `needs_client_trust` on a
// sign-in from an unrecognised device and emailed a confirmation code. That was
// a Clerk feature with no WorkOS equivalent; ADR 0004 records it as lost rather
// than quietly reimplemented, because pretending to have it would be worse.
//
// Errors come back from the server actions as values, never thrown, so every
// failure lands in the red box below instead of a Next error overlay.
//
// EVERY STRING BELOW COMES FROM `messages`. The one category that does not is
// the text `readableError` lifts out of a WorkOS exception in workos-actions.ts
// — that is the vendor's wording, in the vendor's language, and preferring our
// own translated fallback over it would trade "your password was found in a
// breach" for "could not sign in". Known and deliberate; see the debt map.
// ============================================================================

type Step = "credentials" | "verify" | "reset-sent";

/**
 * The callback route bounces here with ?error=… when a social sign-in fails.
 *
 * A list of KEYS rather than a map of sentences: the sentences live in
 * `messages/*.json` now, and an unrecognised value from the query string must
 * not reach `t()` — next-intl renders a missing key as the key itself, which
 * would print "callbackErrors.haha" on screen for anyone who edits the URL.
 */
const CALLBACK_ERROR_KEYS = [
  "state",
  "missing_code",
  "exchange",
  "provider",
] as const;

type CallbackErrorKey = (typeof CALLBACK_ERROR_KEYS)[number];

function asCallbackErrorKey(value: string | null): CallbackErrorKey | null {
  return CALLBACK_ERROR_KEYS.includes(value as CallbackErrorKey)
    ? (value as CallbackErrorKey)
    : null;
}

export function EmailSignInForm() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const callbackErrorKey = asCallbackErrorKey(searchParams.get("error"));
  const callbackError = callbackErrorKey
    ? t(`callbackErrors.${callbackErrorKey}`)
    : null;

  const [step, setStep] = useState<Step>("credentials");
  // Prefilled when the sign-up form sent them here for already having an
  // account. Retyping the address they just typed would make "sign in instead"
  // feel like starting over rather than continuing.
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(callbackError ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await signInWithPassword(email, password);
      // A successful sign-in redirects on the server and never returns.
      if (result?.needsVerification) {
        setNotice(t("notices.codeSent", { email: email.trim() }));
        setStep("verify");
        return;
      }
      if (result?.error) setMessage(result.error);
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

  function startReset() {
    if (!email.trim()) {
      setMessage(t("notices.enterEmailFirst"));
      return;
    }
    setMessage(null);
    startTransition(async () => {
      await sendPasswordReset(email);
      // Always the same answer, whether or not the address exists — see the
      // action. Telling an anonymous caller which addresses are real turns this
      // button into an account-enumeration oracle.
      setNotice(t("notices.resetSent"));
      setStep("reset-sent");
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

      {step === "credentials" && (
        <form onSubmit={submitCredentials} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">{t("fields.email")}</Label>
            <Input
              id="identifier"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("fields.emailPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("fields.password")}</Label>
              <button
                type="button"
                onClick={startReset}
                className="text-primary text-sm font-medium hover:underline"
              >
                {t("actions.forgotPassword")}
              </button>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? t("actions.signingIn") : t("actions.signIn")}
          </Button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={submitCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verify-code">{t("fields.verificationCode")}</Label>
            <Input
              id="verify-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("fields.codePlaceholder")}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? t("actions.verifying") : t("actions.verify")}
          </Button>
        </form>
      )}

      {step === "reset-sent" && (
        <p className="text-muted-foreground text-sm">
          {t("notices.resetOpenLink")}
        </p>
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

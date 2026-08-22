"use client";

import { Fingerprint } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  signInWithPasskey,
  usePasskeySupport,
} from "@/lib/auth/passkey-client";

// ============================================================================
// The explicit way in, for when the invisible one is not available.
//
// PasskeyAutofill is the experience this feature is actually for — the passkey
// offered inside the email field, no button pressed. This is the fallback for
// browsers without conditional UI, and the affordance for people who do not
// know the dropdown is a thing.
//
// RENDERS NOTHING WHEN WEBAUTHN IS ABSENT. A button that cannot work is worse
// than no button: it invites a click and then explains itself. Support is read
// through `usePasskeySupport`, which reports null until the client knows —
// `navigator` does not exist during SSR, so the first paint commits to neither.
//
// A FULL PAGE NAVIGATION ON SUCCESS, not router.push(). The session arrives as
// a Set-Cookie on the verify response; a client-side transition would render
// the next route from a cache that predates it, and the user would land back on
// the sign-in page having just signed in.
// ============================================================================

export function PasskeySignInButton() {
  const t = useTranslations("auth.passkey");
  const supported = usePasskeySupport();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Null means "not known yet" (SSR, pre-hydration). Render nothing until the
  // answer is a definite yes.
  if (supported !== true) return null;

  async function start() {
    setMessage(null);
    setPending(true);
    const result = await signInWithPasskey();
    // Cancelling is not failing — they dismissed the sheet. Say nothing.
    if ("ok" in result) {
      window.location.assign("/");
      return;
    }
    if ("error" in result) setMessage(result.error);
    setPending(false);
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full font-medium"
        onClick={start}
        disabled={pending}
      >
        {pending ? (
          t("signingIn")
        ) : (
          <>
            <Fingerprint className="mr-2 size-4" aria-hidden />
            {t("signIn")}
          </>
        )}
      </Button>

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

"use client";

import { Fingerprint } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { enrolPasskey, usePasskeySupport } from "@/lib/auth/passkey-client";

// ============================================================================
// "Add a passkey so you can skip your password next time."
//
// ── WHY THIS IS A STEP AND NOT A SETTING ──────────────────────────────────
//
// The feature was asked for as: create an account, then next time sign in with
// biometrics instead of a password. That only happens if the offer arrives at
// the one moment the person has just proved who they are and is holding the
// device. A card in settings ships the same capability and produces none of the
// outcome, because nobody goes looking for it.
//
// ── NOT A WALL ────────────────────────────────────────────────────────────
//
// "Not now" is a real button and it is not styled to lose. This is an offer, and
// an offer that cannot be declined is a form. Declining costs nothing: the
// password still works, and PasskeysCard in settings is the way back.
//
// ── IT SHOWS ITSELF OUT ───────────────────────────────────────────────────
//
// A browser without WebAuthn gets sent straight on rather than being shown an
// offer it cannot accept. The redirect is deliberately a full navigation, for
// the same reason it is everywhere else in this feature: the session lives in a
// cookie the server has to re-read.
// ============================================================================

export function PasskeySetupPrompt() {
  const t = useTranslations("auth.passkey");
  const supported = usePasskeySupport();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Nothing to offer here — do not make them read a page to dismiss it.
    // Navigating is a genuine side effect, so it belongs in an effect; the
    // capability READ does not, which is why it is not a setState above.
    if (supported === false) window.location.replace("/");
  }, [supported]);

  function done() {
    window.location.assign("/");
  }

  async function add() {
    setMessage(null);
    setPending(true);
    const result = await enrolPasskey();
    if ("ok" in result) {
      done();
      return;
    }
    // Cancelled — they dismissed the sheet and are still on this page, free to
    // try again or skip. Saying "something went wrong" would be untrue.
    if ("error" in result) setMessage(result.error);
    setPending(false);
  }

  // Until the capability check has run, commit to nothing. `navigator` does not
  // exist during SSR, so a first paint that assumed either way would flicker.
  if (supported === null) return null;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">{t("setupWhy")}</p>

      <Button
        type="button"
        size="lg"
        className="h-11 w-full font-medium"
        onClick={add}
        disabled={pending}
      >
        {pending ? (
          t("adding")
        ) : (
          <>
            <Fingerprint className="mr-2 size-4" aria-hidden />
            {t("add")}
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={done}
        disabled={pending}
      >
        {t("notNow")}
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

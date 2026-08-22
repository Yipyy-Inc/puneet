"use client";

import { useQuery } from "@tanstack/react-query";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  enrolPasskey,
  listPasskeys,
  revokePasskey,
  hasPlatformAuthenticator,
  usePasskeySupport,
  type StoredPasskey,
} from "@/lib/auth/passkey-client";

// ============================================================================
// Manage the passkeys on this account. The third of the three passkey surfaces,
// after the sign-up offer and the sign-in field.
//
// ── REAL, UNLIKE ITS NEIGHBOURS ───────────────────────────────────────────
//
// This sits beside `LoginSecurityCard` (customer) and `ChangePasswordCard`
// (staff), both of which toast success against no backend. This one talks to
// `/api/auth/passkey` and reports what actually happened — an error is shown as
// an error. Do not copy the neighbours' pattern into it.
//
// ── ENGLISH STRINGS, AND NOT AN OVERSIGHT ─────────────────────────────────
//
// The other two passkey surfaces use next-intl. This one cannot: the ONLY
// `NextIntlClientProvider` in the app is inside `AuthCard`, scoped to the
// `auth` namespace, so a `useTranslations` call in a settings client component
// throws "No intl context found" at runtime — a crash that typechecks cleanly
// and only appears when somebody opens the page. Every neighbouring card here
// is hardcoded English for the same reason; the settings screens have simply
// never been translated.
//
// The fix is a provider around the settings tree, not a workaround here. Until
// then this matches its neighbours rather than pretending to a capability the
// page does not have.
//
// ── EVERY LIST IS ALREADY THE CALLER'S OWN ────────────────────────────────
//
// No owner is passed in and none is filtered on: the select policy on
// `user_passkeys` is `profile_id = auth.jwt()->>'sub'`, so the endpoint cannot
// return anybody else's rows. A prop for "whose passkeys" would be a second
// place for that rule to live, and a chance for the two to disagree.
// ============================================================================

function useLocale() {
  return typeof navigator === "undefined" ? "en" : navigator.language;
}

export function PasskeysCard() {
  const locale = useLocale();

  const supported = usePasskeySupport();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // useQuery rather than useEffect + useState, per CLAUDE.md ("use
  // @tanstack/react-query for all data fetching"). It also sidesteps
  // `react-hooks/set-state-in-effect`, which fires on the fetch-then-setState
  // shape even when the setState is in a microtask.
  const { data: passkeys, refetch } = useQuery({
    queryKey: ["passkeys"],
    queryFn: listPasskeys,
  });

  // Enrolment asks for the device's own sensor, so a machine without one
  // cannot complete it. Checked before offering, not after failing.
  const { data: hasSensor } = useQuery({
    queryKey: ["passkeys", "platform-authenticator"],
    queryFn: hasPlatformAuthenticator,
  });

  const refresh = () => refetch();

  async function add() {
    setAdding(true);
    const result = await enrolPasskey();
    // A cancellation is silent — they closed the sheet on purpose.
    if ("ok" in result) {
      toast.success("Passkey added.");
      await refresh();
    } else if ("error" in result) {
      toast.error(result.error);
    }
    setAdding(false);
  }

  async function remove(credentialId: string) {
    setBusy(credentialId);
    const result = await revokePasskey(credentialId);
    if ("ok" in result) {
      toast.success("Passkey removed.");
      await refresh();
    } else if ("error" in result) {
      toast.error(result.error);
    }
    setBusy(null);
  }

  function describe(passkey: StoredPasskey) {
    const added = new Date(passkey.created_at).toLocaleDateString(locale);
    const used = passkey.last_used_at
      ? `Last used ${new Date(passkey.last_used_at).toLocaleDateString(locale)}`
      : "Not used yet";
    return `Added ${added} · ${used}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="size-4" aria-hidden />
          Passkeys
        </CardTitle>
        <CardDescription>
          Sign in with your fingerprint, face or device PIN instead of a
          password.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {supported === false && (
          <p className="text-muted-foreground text-sm">
            This browser cannot use passkeys.
          </p>
        )}

        {supported === true && hasSensor === false && (
          <p className="text-muted-foreground text-sm">
            This device has no fingerprint reader, face scanner or PIN set up,
            so a passkey cannot be added here. Any passkey you already have
            still works.
          </p>
        )}

        {passkeys === undefined ? (
          <Loader2
            className="text-muted-foreground size-4 animate-spin"
            aria-hidden
          />
        ) : passkeys.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You have not added a passkey yet.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {passkeys.map((passkey) => (
              <li
                key={passkey.credential_id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {passkey.nickname ?? "Passkey"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {describe(passkey)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {/*
                    A synced credential survives losing the device; a
                    device-bound one does not. Users cannot tell these apart
                    otherwise, and it is the difference that matters when
                    deciding whether this is their only way in.
                  */}
                  <Badge variant="outline">
                    {passkey.backed_up
                      ? "Synced across your devices"
                      : "This device only"}
                  </Badge>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => remove(passkey.credential_id)}
                    disabled={busy === passkey.credential_id}
                    aria-label="Remove passkey"
                  >
                    {busy === passkey.credential_id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="size-4" aria-hidden />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {supported !== false && hasSensor !== false && (
          <Button
            type="button"
            variant="outline"
            onClick={add}
            disabled={adding}
          >
            {adding ? "Waiting for your device…" : "Add a passkey"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

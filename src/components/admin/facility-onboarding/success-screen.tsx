"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

// ============================================================================
// What actually happened when the facility was created.
//
// This screen used to say, unconditionally:
//
//   "A welcome email with a login link has been sent to the primary admin."
//
// It was rendered by a handler that made no request at all, so both halves of
// that sentence were false — no facility, no email. A superadmin then waited
// for an invitation that was never going to arrive, and the facilities list
// they were sent to had nothing new in it.
//
// So this now reports the OUTCOME it was given. When the email could not be
// sent — no RESEND_API_KEY, or the provider rejected it — it says so and hands
// over the link, because the owner's access is recorded either way and a link
// passed on by hand works exactly as well.
// ============================================================================

export interface OwnerInviteOutcome {
  sent?: boolean;
  reason?: string;
  message?: string;
  signUpUrl?: string;
  ownerEmail?: string;
  alreadyRegistered?: boolean;
}

/** What happened to `<slug>.yipyy.com` — see lib/vercel/domains.ts. */
export interface DomainOutcome {
  attached?: boolean;
  host?: string | null;
  verified?: boolean;
  reason?: string;
}

export function SuccessScreen({
  facilityName,
  ownerEmail,
  invite,
  domain,
  onViewProfile,
  onClose,
}: {
  facilityName: string;
  ownerEmail?: string;
  invite?: OwnerInviteOutcome | null;
  domain?: DomainOutcome | null;
  onViewProfile: () => void;
  onClose: () => void;
}) {
  const emailed = invite?.sent === true;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
        <CheckCircle2 className="size-8" />
      </span>

      <div className="space-y-1.5">
        <h3 className="text-xl font-semibold tracking-tight">
          Facility created
        </h3>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          {facilityName
            ? `${facilityName} is ready.`
            : "The facility is ready."}
        </p>
      </div>

      {emailed && (
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          An invitation is on its way to <strong>{ownerEmail}</strong>.{" "}
          {invite?.alreadyRegistered
            ? "They already had a Yipyy account, so their access is live now."
            : "They set their own password when they sign up."}
        </p>
      )}

      {invite && !emailed && (
        <div className="mx-auto max-w-md space-y-3 text-left">
          <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-500">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>The invitation email was not sent.</strong>{" "}
              {invite.message ??
                "Their access is recorded, so sending the link by hand works just as well."}
            </span>
          </p>
          {invite.signUpUrl && (
            <div className="bg-muted rounded-md border p-3">
              <p className="text-muted-foreground mb-1 text-xs">
                Send {ownerEmail} this link — they must sign up with that exact
                address:
              </p>
              <code className="text-xs break-all">{invite.signUpUrl}</code>
            </div>
          )}
        </div>
      )}

      {domain?.attached && domain.host && (
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">
          Their own web address is{" "}
          <strong className="text-foreground">{domain.host}</strong>
          {domain.verified
            ? "."
            : " — the certificate takes a few minutes to issue."}
        </p>
      )}

      {domain && !domain.attached && (
        <p className="mx-auto flex max-w-md items-start gap-2 text-left text-sm text-amber-700 dark:text-amber-500">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>Their web address is not live yet.</strong> {domain.reason}{" "}
            The facility itself is fine — attach it from the facility&apos;s
            Overview tab.
          </span>
        </p>
      )}

      {/* The old note here said the facilities list "still reads demo data, so
          it will not appear there yet". That stopped being true when the list
          was moved onto Postgres, and a stale reassurance is worse than none:
          it tells a superadmin not to look for the thing they should look
          for. */}
      <p className="text-muted-foreground mx-auto max-w-sm text-xs">
        It is in the facilities list now.
      </p>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button
          onClick={onViewProfile}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Back to facilities
        </Button>
      </div>
    </div>
  );
}

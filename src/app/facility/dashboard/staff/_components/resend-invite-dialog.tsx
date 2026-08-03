"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Copy, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import type { StaffProfile } from "@/types/facility-staff";
import { useQueryClient } from "@tanstack/react-query";
import {
  useOnboardingInstance,
  instanceKeys,
} from "@/lib/api/onboarding-instances";
import {
  useOnboardingTemplates,
  resolveTemplateForRole,
} from "@/lib/api/staff-onboarding";
import { OnboardingInviteEmail } from "@/components/facility/staff-hr/onboarding-invite-email";

/**
 * Send / resend the onboarding invite for an invited staff member.
 *
 * THIS NOW SENDS. It posts to /api/staff/[id]/invite, which creates the auth
 * account, links the membership, mints a fresh token and hands the whole thing
 * to Resend. Resending reissues the token, and because only its hash is stored,
 * the previous link stops working the moment this succeeds.
 *
 * The three outcomes are reported as three different things, because they are:
 *
 *   sent            the provider accepted it
 *   not_configured  no RESEND_API_KEY (or no service-role key) — the link is
 *                   handed back so the manager can deliver it themselves
 *   send_failed     the provider rejected it; the staff row was NOT left
 *                   claiming an invitation nobody received
 *
 * THE LINK IS SHOWN ONCE, AND ONLY RIGHT AFTER SENDING. It used to render
 * `/onboard/${instance.token}` from the stored instance, which the database
 * cannot answer — only a sha256 hash of the token is kept, deliberately, so a
 * leaked dump hands over no live onboarding links. The route returns
 * `onboardingUrl` in the response that mints it and never again, so that is
 * what this holds, in local state, for as long as the dialog is open.
 *
 * Reopening the dialog therefore shows no link, and offers to resend instead.
 * That is the correct behaviour for a bearer credential rather than a gap: a
 * manager who lost the link reissues it, which invalidates the old one.
 */
export function ResendInviteDialog({
  profile,
  open,
  onOpenChange,
  onSent,
}: {
  profile: StaffProfile | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent?: (profile: StaffProfile) => void;
}) {
  // Above the early return, with the other hooks: hooks run in the same order
  // every render or they run wrong, and `if (!profile) return null` below is an
  // early return this must not sit after.
  const [sending, setSending] = useState(false);
  // The freshly-minted link, held only for this dialog session. See the header.
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const templates = useOnboardingTemplates();
  const instance = useOnboardingInstance(profile?.id);
  const template = instance
    ? templates.find((t) => t.id === instance.templateId)
    : profile
      ? resolveTemplateForRole(templates, profile.primaryRole)
      : undefined;

  if (!profile) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // Relative or absolute depending on what the route returned; displayed as-is.
  const path = issuedUrl ? issuedUrl.replace(origin, "") : "";

  const send = async () => {
    setSending(true);
    try {
      const response = await fetch(`/api/staff/${profile.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template?.id }),
      });
      const result = (await response.json().catch(() => null)) as {
        sent?: boolean;
        reason?: string;
        message?: string;
        setupUrl?: string;
        onboardingUrl?: string;
        error?: string;
      } | null;

      if (result?.sent) {
        toast.success(`Onboarding email sent to ${profile.email}`);
      } else if (result?.reason === "not_configured") {
        // Not an error and not a success. The account is real; the delivery is
        // the manager's to make. Saying "sent" here would be the exact lie the
        // admin-invite route was written to avoid.
        toast.warning(result.message ?? "Email service not configured.", {
          description: result.setupUrl
            ? "Copy the link below to share it."
            : undefined,
          duration: 8000,
        });
      } else {
        toast.error(
          result?.message ?? result?.error ?? "Could not send the invitation.",
        );
        return;
      }

      // The route created or reissued the instance server-side, so the cached
      // list is stale — invalidate rather than mirroring the write locally.
      if (result.onboardingUrl) setIssuedUrl(result.onboardingUrl);
      void queryClient.invalidateQueries({ queryKey: instanceKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      onSent?.(profile);
    } catch {
      toast.error("Could not reach the server. Nothing was sent.");
    } finally {
      setSending(false);
    }
  };

  const copy = () => {
    if (!path) return;
    navigator.clipboard?.writeText(`${origin}${path}`);
    toast.success("Onboarding link copied");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {instance ? "Resend onboarding invite" : "Send onboarding invite"}
          </DialogTitle>
          <DialogDescription>
            {instance
              ? `Reissue ${profile.email}'s onboarding link — this invalidates the old one.`
              : `Send ${profile.email} their onboarding link to get started.`}
          </DialogDescription>
        </DialogHeader>

        {issuedUrl ? (
          <div className="space-y-3">
            <OnboardingInviteEmail
              staff={profile}
              template={template}
              token={issuedUrl.split("/onboard/")[1]}
            />
            <div className="bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2">
              <code className="min-w-0 flex-1 truncate text-xs">{path}</code>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={copy}
              >
                <Copy className="size-3.5" /> Copy
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              This link is shown once. Close this dialog and it cannot be
              retrieved — only a hash of it is stored. Resend to issue a new
              one.
            </p>
          </div>
        ) : instance ? (
          <div className="text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm">
            An invite is outstanding
            {instance.invitedAt
              ? `, sent ${new Date(instance.invitedAt).toLocaleDateString()}`
              : ""}
            {instance.tokenExpiresAt
              ? `, expiring ${new Date(instance.tokenExpiresAt).toLocaleDateString()}`
              : ""}
            . The link itself is not stored and cannot be shown again — resend
            to issue a new one, which invalidates the old.
          </div>
        ) : (
          <div className="text-muted-foreground rounded-md border border-dashed px-4 py-6 text-center text-sm">
            No onboarding link yet. Send one to generate it.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => void send()}
            disabled={sending}
          >
            {instance ? (
              <>
                <RefreshCw className="size-4" /> Resend (new link)
              </>
            ) : (
              <>
                <Send className="size-4" /> Send invite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

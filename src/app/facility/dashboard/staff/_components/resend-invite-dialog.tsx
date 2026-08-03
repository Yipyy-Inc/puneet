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
import {
  useOnboardingInstance,
  useOnboardingTemplates,
  createOnboardingInstance,
  regenerateOnboardingToken,
  resolveTemplateForRole,
} from "@/data/staff-onboarding";
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
 * The local store is still updated alongside so the rest of the screen (which
 * reads the mock instance) stays consistent until it moves onto the API.
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
  const templates = useOnboardingTemplates();
  const instance = useOnboardingInstance(profile?.id);
  const template = instance
    ? templates.find((t) => t.id === instance.templateId)
    : profile
      ? resolveTemplateForRole(profile.primaryRole)
      : undefined;

  if (!profile) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const path = instance ? `/onboard/${instance.token}` : "";

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

      // Keep the local store in step so the rest of the staff screen — which
      // still reads the mock instance — shows the same state as the database.
      if (instance) {
        regenerateOnboardingToken(profile.id);
      } else {
        createOnboardingInstance(profile.id, template?.id ?? "");
      }
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

        {instance ? (
          <div className="space-y-3">
            <OnboardingInviteEmail
              staff={profile}
              template={template}
              token={instance.token}
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

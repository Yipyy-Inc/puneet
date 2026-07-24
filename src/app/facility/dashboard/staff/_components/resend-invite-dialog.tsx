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
 * Send / resend the onboarding invite for an invited staff member. Shows the
 * branded email preview + the testable /onboard/[token] link with a Copy
 * button. Resend reissues the token (invalidating the old link). Mock send —
 * a toast + the stored instance; no real email.
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

  const send = () => {
    const inst = instance
      ? regenerateOnboardingToken(profile.id)
      : createOnboardingInstance(profile.id, template?.id ?? "");
    if (!inst) return;
    toast.success(
      `Onboarding email ${instance ? "resent" : "sent"} to ${profile.email}`,
      { description: `Link: /onboard/${inst.token}` },
    );
    onSent?.(profile);
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
            onClick={send}
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
